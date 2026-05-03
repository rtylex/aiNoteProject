import asyncio
import os
import requests
import io
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentEmbedding
from app.services.gemini_service import gemini_service
from app.services.deepseek_service import deepseek_service
from app.db.session import SessionLocal
import uuid

def process_document(document_id: str, file_path: str | None = None):
    asyncio.run(_process_document(document_id, file_path))

async def _process_document(document_id: str, file_path: str | None = None):
    db: Session = SessionLocal()
    document = None
    try:
        doc_uuid = uuid.UUID(document_id)
        document = db.query(Document).filter(Document.id == doc_uuid).first()
        if not document:
            print(f"Document {document_id} not found")
            return

        document.status = "processing"
        db.commit()

        pdf_file = None

        # Priority 1: Use the explicit file_path argument (local disk path)
        if file_path and os.path.isfile(file_path):
            print(f"[PDF] Reading local file: {file_path}")
            with open(file_path, "rb") as f:
                pdf_file = io.BytesIO(f.read())

        # Priority 2: If file_url is an HTTP URL, download it
        elif document.file_url and document.file_url.startswith("http"):
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.get(document.file_url, timeout=60)
                    response.raise_for_status()
                    pdf_file = io.BytesIO(response.content)
                    break
                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                    if attempt < max_retries - 1:
                        print(f"Download attempt {attempt + 1} failed, retrying: {e}")
                        await asyncio.sleep(2 ** attempt)
                    else:
                        raise

        # Priority 3: If file_url is a relative /uploads/ path, resolve it locally
        elif document.file_url and document.file_url.startswith("/uploads/"):
            from app.core.config import settings
            local_path = os.path.join(settings.UPLOAD_DIR, document.file_url.replace("/uploads/", "", 1))
            if os.path.isfile(local_path):
                print(f"[PDF] Reading from uploads dir: {local_path}")
                with open(local_path, "rb") as f:
                    pdf_file = io.BytesIO(f.read())

        if not pdf_file:
            if document.file_url and "mock_url" in document.file_url:
                text = "This is a sample text from the PDF (Real AI Processing Active but File was Mock)."
                embedding = await gemini_service.generate_embedding(text)
                db_embedding = DocumentEmbedding(
                    document_id=document.id,
                    content=text,
                    embedding=embedding
                )
                db.add(db_embedding)
                document.status = "completed"
                db.commit()
                return

        reader = PdfReader(pdf_file)
        
        # First, try normal text extraction
        page_texts = []
        total_text_chars = 0
        
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text and len(text.strip()) >= 10:
                page_texts.append(text)
                total_text_chars += len(text.strip())
        
        print(f"Normal extraction: {len(page_texts)} pages, {total_text_chars} total chars")
        
        # If we got very little text, try OCR — DeepSeek first, Gemini fallback
        if total_text_chars < 100:
            print(f"[PDF] Insufficient text ({total_text_chars} chars < 100), triggering OCR...")
            ocr_text = ""

            # --- Önce DeepSeek Vision ile dene ---
            if deepseek_service.enabled:
                print("[PDF] Trying DeepSeek Vision OCR...")
                try:
                    pdf_file.seek(0)
                    pdf_bytes = pdf_file.read()
                    ocr_text = await deepseek_service.ocr_pdf_file(pdf_bytes)
                    if ocr_text and len(ocr_text.strip()) >= 50:
                        print(f"[PDF] DeepSeek OCR SUCCESS: {len(ocr_text)} chars")
                    else:
                        print(f"[PDF] DeepSeek OCR returned insufficient text ({len(ocr_text) if ocr_text else 0} chars), falling back to Gemini...")
                        ocr_text = ""
                except Exception as ds_err:
                    print(f"[PDF] DeepSeek OCR FAILED: {ds_err}, falling back to Gemini...")
                    ocr_text = ""
            else:
                print("[PDF] DeepSeek not configured, skipping to Gemini OCR")

            # --- DeepSeek başarısız olduysa Gemini'ye fallback ---
            if not ocr_text:
                print("[PDF] Calling Gemini OCR as fallback...")
                try:
                    pdf_file.seek(0)
                    pdf_bytes = pdf_file.read()
                    print(f"[PDF] Read {len(pdf_bytes)} bytes from PDF file")
                    ocr_text = await gemini_service.ocr_pdf_file(pdf_bytes)
                    print(f"[PDF] Gemini OCR returned: {len(ocr_text) if ocr_text else 0} chars")
                except Exception as e:
                    print(f"[PDF] Gemini OCR FAILED: {e}")
                    import traceback
                    traceback.print_exc()

            # --- OCR sonucunu chunk'lara böl ---
            if ocr_text and len(ocr_text.strip()) >= 50:
                chunk_size = 2000
                ocr_chunks = []
                for i in range(0, len(ocr_text), chunk_size):
                    chunk = ocr_text[i:i+chunk_size]
                    if len(chunk.strip()) >= 20:
                        ocr_chunks.append(chunk)
                page_texts = ocr_chunks
                print(f"[PDF] OCR text split into {len(page_texts)} chunks")
            else:
                print(f"[PDF] OCR failed entirely: {len(ocr_text) if ocr_text else 0} chars")

        print(f"Processing {len(page_texts)} pages for document {document_id}")

        # Process embeddings in parallel chunks (max 3 concurrent to avoid API rate limiting)
        chunk_size = 3
        page_index = 0  # Track page/chunk order for hybrid context retrieval
        for i in range(0, len(page_texts), chunk_size):
            chunk = page_texts[i:i+chunk_size]
            print(f"Processing chunk {i//chunk_size + 1}: pages {i} to {i+len(chunk)-1}")

            # Create concurrent embedding tasks with retry logic
            embedding_tasks = []
            for text in chunk:
                task = gemini_service.generate_embedding(text)
                embedding_tasks.append(task)

            # Wait for all embeddings in this chunk to complete with timeout
            try:
                embeddings = await asyncio.gather(*embedding_tasks, return_exceptions=True)
            except Exception as e:
                print(f"Error in embedding batch: {e}")
                document.status = "failed"
                db.commit()
                return

            # Save embeddings to database
            for idx, (text, embedding) in enumerate(zip(chunk, embeddings)):
                # If embedding failed, try OCR fallback
                if isinstance(embedding, Exception):
                    print(f"Embedding failed for page, attempting OCR fallback: {embedding}")
                    try:
                        # Use Gemini to clean/extract text from problematic content
                        ocr_text = await gemini_service.extract_text_with_vision(text)
                        if ocr_text and len(ocr_text.strip()) >= 10:
                            # Retry embedding with OCR-extracted text
                            embedding = await gemini_service.generate_embedding(ocr_text)
                            text = ocr_text  # Use the cleaned text
                            print(f"OCR fallback successful, got embedding")
                        else:
                            print(f"OCR fallback returned insufficient text, skipping page")
                            continue
                    except Exception as ocr_error:
                        print(f"OCR fallback also failed: {ocr_error}")
                        continue

                db_embedding = DocumentEmbedding(
                    document_id=document.id,
                    page_number=page_index + idx,  # Track order for full-doc retrieval
                    content=text,
                    embedding=embedding
                )
                db.add(db_embedding)
            
            # Update page_index for next chunk
            page_index += len(chunk)

            # Commit after each chunk
            try:
                db.commit()
                print(f"Committed chunk {i//chunk_size + 1}")
            except Exception as e:
                print(f"Error committing chunk: {e}")
                db.rollback()

            # Small delay between chunks to avoid rate limiting
            await asyncio.sleep(1)

        document.status = "completed"
        db.commit()
        print(f"Successfully processed document {document_id}")

    except Exception as e:
        print(f"Error processing document {document_id}: {e}")
        if document:
            try:
                # Try to rollback any pending transaction first
                db.rollback()
                # Create a fresh session to update status
                fresh_db = SessionLocal()
                try:
                    doc = fresh_db.query(Document).filter(Document.id == doc_uuid).first()
                    if doc:
                        doc.status = "failed"
                        fresh_db.commit()
                finally:
                    fresh_db.close()
            except Exception as status_error:
                print(f"Failed to update document status: {status_error}")
    finally:
        try:
            db.close()
        except Exception:
            pass

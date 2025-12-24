import asyncio
import requests
import io
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentEmbedding
from app.services.gemini_service import gemini_service
from app.services.storage_security import ensure_allowed_storage_url, InvalidStorageURLError
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

        if document.file_url and document.file_url.startswith("http"):
            try:
                ensure_allowed_storage_url(document.file_url)
            except InvalidStorageURLError as exc:
                print(f"Blocked file URL for document {document_id}: {exc}")
                document.status = "failed"
                db.commit()
                return

            # Retry logic for downloading PDF with increased timeout
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
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    else:
                        raise
        elif file_path and "mock_url" not in file_path:
            pass
        else:
            pass

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
        
        # If we got very little text, use Gemini to OCR the entire PDF
        if total_text_chars < 100:
            print(f"[PDF] Insufficient text ({total_text_chars} chars < 100), triggering Gemini PDF OCR...")
            try:
                # Reset file pointer and get PDF bytes
                pdf_file.seek(0)
                pdf_bytes = pdf_file.read()
                print(f"[PDF] Read {len(pdf_bytes)} bytes from PDF file")
                
                # Use Gemini to extract text from the PDF
                print("[PDF] Calling gemini_service.ocr_pdf_file()...")
                ocr_text = await gemini_service.ocr_pdf_file(pdf_bytes)
                print(f"[PDF] OCR returned: {len(ocr_text) if ocr_text else 0} chars")
                
                if ocr_text and len(ocr_text.strip()) >= 50:
                    # Split OCR text into chunks for embedding
                    # Each chunk ~2000 chars for good embedding quality
                    chunk_size = 2000
                    ocr_chunks = []
                    
                    for i in range(0, len(ocr_text), chunk_size):
                        chunk = ocr_text[i:i+chunk_size]
                        if len(chunk.strip()) >= 20:
                            ocr_chunks.append(chunk)
                    
                    page_texts = ocr_chunks
                    print(f"[PDF] Gemini OCR SUCCESS: {len(ocr_text)} chars split into {len(page_texts)} chunks")
                else:
                    print(f"[PDF] Gemini OCR returned insufficient text: {len(ocr_text) if ocr_text else 0} chars")
            except Exception as e:
                print(f"[PDF] Gemini PDF OCR FAILED: {e}")
                import traceback
                traceback.print_exc()



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

"""
Test Service - Business logic for test generation, submission and management.

This service handles:
- AI-powered test generation from PDF document content
- Test submission and scoring
- Test history management
"""
import uuid
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.test import Test, TestQuestion, TestAttempt
from app.models.document import Document, DocumentEmbedding
from app.services.deepseek_service import deepseek_service


TEST_SYSTEM_PROMPT = """Sen akademik soru hazırlama uzmanısın. Aşağıdaki ders içeriğinden çoktan seçmeli soru hazırlıyorsun.

KURALLAR:
- Türkçe sorular hazırla
- Zorluk seviyesi: orta
- Her soru 4 seçenekli olsun (A, B, C, D)
- Sadece 1 doğru cevap olsun
- Her soru için kısa açıklayıcı cevap yaz
- Çeldirici seçenekler gerçekçi olsun (diğer seçenekler de mantıklı olsun ama biri kesin doğru olsun)
- Soru metni net ve anlaşılır olsun
- Bilgi düzeyi değil kavrama ve uygulama düzeyinde sorular sor

JSON formatında dön (açıklama alanı Türkçe ve 1-2 cümle olsun):
{
  "questions": [
    {
      "question": "Soru metni buraya yazılır?",
      "options": ["A) Seçenek 1", "B) Seçenek 2", "C) Seçenek 3", "D) Seçenek 4"],
      "correct_answer": "B",
      "explanation": "Doğru cevap B çünkü..."
    }
  ]
}"""


def extract_document_content(db: Session, document_id: uuid.UUID) -> str:
    """Extract full text content from document embeddings for test generation."""
    embeddings = db.query(DocumentEmbedding).filter(
        DocumentEmbedding.document_id == document_id
    ).order_by(DocumentEmbedding.page_number).all()

    if not embeddings:
        return ""

    content_parts = []
    for emb in embeddings:
        if emb.content:
            content_parts.append(emb.content)

    return "\n\n".join(content_parts)


def extract_session_content(db: Session, session_id: uuid.UUID) -> str:
    """Extract combined content from all documents in a multi-document session."""
    from app.models.chat import MultiDocumentSession, multi_session_documents

    session = db.query(MultiDocumentSession).filter(MultiDocumentSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    session_doc_ids = db.query(multi_session_documents.c.document_id).filter(
        multi_session_documents.c.session_id == session_id
    ).all()

    if not session_doc_ids:
        raise ValueError("Session has no documents")

    doc_ids = [row[0] for row in session_doc_ids]

    contents = []
    for doc_id in doc_ids:
        doc_embeddings = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        for emb in doc_embeddings:
            if emb.content:
                contents.append(emb.content)

    return "\n\n---\n\n".join(contents) if contents else ""


def extract_public_documents_content(db: Session, document_ids: list[uuid.UUID]) -> str:
    """Extract combined content from multiple public documents (for library multi-select)."""
    contents = []

    for doc_id in document_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            continue

        doc_embeddings = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        content_parts = []
        for emb in doc_embeddings:
            if emb.content:
                content_parts.append(emb.content)

        if content_parts:
            contents.append(f"--- {doc.title} ---\n\n" + "\n\n".join(content_parts))

    return "\n\n---\n\n".join(contents) if contents else ""


def suggest_question_count(document_content: str) -> int:
    """
    Suggest question count based on document length.
    Min: 5, Max: 20, suggested: 10-15 based on content size.
    """
    char_count = len(document_content)

    if char_count < 2000:
        return 5
    elif char_count < 5000:
        return 10
    elif char_count < 10000:
        return 15
    else:
        return 20


def _calculate_max_tokens(question_count: int) -> int:
    """Calculate max tokens based on question count. Each question needs ~350-400 tokens."""
    base_tokens = 512
    per_question_tokens = 400
    calculated = base_tokens + (question_count * per_question_tokens)
    return min(max(calculated, 4096), 16384)


def _extract_partial_questions(text: str) -> list[dict]:
    """Extract complete questions from partial/malformed JSON response."""
    import re
    questions = []
    
    pattern = r'\{[^{}]*"question"\s*:\s*"[^"]*"[^{}]*"options"\s*:\s*\[[^\]]*\][^{}]*"correct_answer"\s*:\s*"[^"]*"[^{}]*"explanation"\s*:\s*"[^"]*"[^{}]*\}'
    
    matches = re.findall(pattern, text, re.DOTALL)
    
    for match in matches:
        try:
            obj = json.loads(match)
            if all(k in obj for k in ["question", "options", "correct_answer"]):
                questions.append(obj)
        except json.JSONDecodeError:
            continue
    
    if not questions:
        try:
            questions_block = re.search(r'"questions"\s*:\s*\[(.*)', text, re.DOTALL)
            if questions_block:
                partial_json = '{"questions": [' + questions_block.group(1)
                
                while partial_json and not partial_json.rstrip().endswith(']}'):
                    partial_json = partial_json.rstrip()[:-1]
                
                if partial_json.rstrip().endswith(']}'):
                    parsed = json.loads(partial_json)
                    if "questions" in parsed and isinstance(parsed["questions"], list):
                        questions = [q for q in parsed["questions"] if isinstance(q, dict) and "question" in q]
        except (json.JSONDecodeError, Exception):
            pass
    
    return questions


async def generate_test_questions(
    document_content: str,
    question_count: int
) -> dict:
    """
    Generate test questions using DeepSeek AI.

    Args:
        document_content: Full text content from document
        question_count: Number of questions to generate

    Returns:
        Dict with 'questions' list and optional 'partial' flag and 'requested_count'
    """
    if not deepseek_service.enabled:
        raise ValueError("DeepSeek service is not enabled")

    max_tokens = _calculate_max_tokens(question_count)

    user_prompt = f"""Aşağıdaki ders içeriğinden {question_count} adet çoktan seçmeli soru hazırla:

DERS İÇERİĞİ:
{document_content[:15000]}"""

    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def _generate():
            response = deepseek_service.client.chat.completions.create(
                model=deepseek_service.model,
                messages=[
                    {"role": "system", "content": TEST_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content

        result = await asyncio.wait_for(
            loop.run_in_executor(None, _generate),
            timeout=180.0
        )

        if not result:
            raise ValueError("Empty response from AI")

        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json"):].strip()
        if cleaned.startswith("```"):
            cleaned = cleaned[len("```"):].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            partial_questions = _extract_partial_questions(cleaned)
            if partial_questions and len(partial_questions) >= 3:
                return {
                    "questions": partial_questions,
                    "partial": True,
                    "requested_count": question_count,
                    "generated_count": len(partial_questions)
                }
            raise ValueError(f"Invalid JSON from AI and could not extract partial questions")

        if "questions" not in parsed or not isinstance(parsed["questions"], list):
            raise ValueError(f"Invalid AI response format: {result[:200]}")

        return {
            "questions": parsed["questions"],
            "partial": False,
            "requested_count": question_count,
            "generated_count": len(parsed["questions"])
        }

    except asyncio.TimeoutError:
        raise ValueError("AI timeout - test generation took too long")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Test generation failed: {str(e)}")


def create_test(
    db: Session,
    user_id: uuid.UUID,
    document_id: uuid.UUID | None,
    title: str,
    questions_data: list[dict],
    question_count: int
) -> Test:
    """Create a test with questions in the database."""
    original_expire = db.expire_on_commit
    db.expire_on_commit = False
    try:
        test = Test(
            id=uuid.uuid4(),
            user_id=user_id,
            document_id=document_id,
            title=title,
            question_count=question_count,
            total_questions=len(questions_data),
            completed=False,
            is_public=False
        )
        db.add(test)
        db.flush()

        for idx, q_data in enumerate(questions_data):
            question = TestQuestion(
                id=uuid.uuid4(),
                test_id=test.id,
                question_text=q_data["question"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation", ""),
                order_num=idx + 1
            )
            db.add(question)

        db.commit()
        return test
    finally:
        db.expire_on_commit = original_expire


def submit_test(
    db: Session,
    test_id: uuid.UUID,
    user_id: uuid.UUID,
    answers: list[dict]
) -> dict:
    """
    Submit test answers and calculate score.

    Args:
        db: Database session
        test_id: Test UUID
        user_id: User UUID (for access check)
        answers: List of {"question_id": str, "answer": str}

    Returns:
        Result dict with score, percentage, and questions with explanations
    """
    test = db.query(Test).filter(
        Test.id == test_id,
        Test.user_id == user_id
    ).first()

    if not test:
        raise ValueError("Test not found or access denied")

    if test.completed:
        raise ValueError("Test already completed")

    questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test_id
    ).order_by(TestQuestion.order_num).all()

    answer_map = {uuid.UUID(a["question_id"]): a["answer"].upper() for a in answers}

    score = 0
    questions_with_results = []

    for question in questions:
        user_answer = answer_map.get(question.id)
        is_correct = user_answer == question.correct_answer.upper() if user_answer else False

        if is_correct:
            score += 1

        question.user_answer = user_answer
        question.is_correct = is_correct

        questions_with_results.append({
            "id": str(question.id),
            "question_text": question.question_text,
            "options": question.options,
            "correct_answer": question.correct_answer,
            "user_answer": user_answer or None,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "order_num": question.order_num
        })

    test.score = score
    test.total_questions = len(questions)
    test.completed = True
    test.completed_at = datetime.utcnow()

    db.commit()

    percentage = int((score / test.total_questions) * 100) if test.total_questions > 0 else 0

    # Save attempt history
    attempt = TestAttempt(
        id=uuid.uuid4(),
        test_id=test_id,
        user_id=user_id,
        score=score,
        total_questions=test.total_questions,
        percentage=percentage,
        answers_snapshot=[
            {
                "question_id": str(q.id),
                "user_answer": q.user_answer,
                "is_correct": q.is_correct,
                "correct_answer": q.correct_answer
            }
            for q in questions
        ]
    )
    db.add(attempt)
    db.commit()

    return {
        "test_id": str(test.id),
        "score": score,
        "total": test.total_questions,
        "percentage": percentage,
        "completed_at": test.completed_at.isoformat() if test.completed_at else None,
        "questions": questions_with_results
    }


def get_test_with_questions(
    db: Session,
    test_id: uuid.UUID,
    user_id: uuid.UUID,
    include_answers: bool = False
) -> dict:
    """Get test details with questions."""
    test = db.query(Test).filter(Test.id == test_id).first()

    if not test:
        raise ValueError("Test not found")

    if not test.is_public and test.user_id != user_id:
        from app.models.user import UserProfile, UserRole
        user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if not user or user.role != UserRole.ADMIN:
            raise ValueError("Access denied")

    questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test_id
    ).order_by(TestQuestion.order_num).all()

    result_questions = []
    for q in questions:
        q_dict = {
            "id": str(q.id),
            "question_text": q.question_text,
            "options": q.options,
            "order_num": q.order_num
        }
        if include_answers:
            q_dict["correct_answer"] = q.correct_answer
            q_dict["explanation"] = q.explanation
            q_dict["user_answer"] = q.user_answer
            q_dict["is_correct"] = q.is_correct
        result_questions.append(q_dict)

    return {
        "id": str(test.id),
        "title": test.title,
        "document_id": str(test.document_id) if test.document_id else None,
        "question_count": test.question_count,
        "total_questions": test.total_questions,
        "score": test.score,
        "completed": test.completed,
        "is_public": test.is_public,
        "created_at": test.created_at.isoformat() if test.created_at else None,
        "completed_at": test.completed_at.isoformat() if test.completed_at else None,
        "questions": result_questions
    }


def list_user_tests(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """List all tests for a user."""
    tests = db.query(Test).filter(
        Test.user_id == user_id
    ).order_by(Test.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": str(t.id),
            "title": t.title,
            "document_id": str(t.document_id) if t.document_id else None,
            "total_questions": t.total_questions,
            "score": t.score,
            "completed": t.completed,
            "is_public": t.is_public,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None
        }
        for t in tests
    ]


def list_public_tests(
    db: Session,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """List all public tests."""
    tests = db.query(Test).filter(
        Test.is_public == True,
        Test.completed == True
    ).order_by(Test.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": str(t.id),
            "title": t.title,
            "user_id": str(t.user_id) if t.user_id else None,
            "total_questions": t.total_questions,
            "score": t.score,
            "percentage": int((t.score / t.total_questions) * 100) if t.total_questions > 0 else 0,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in tests
    ]


def delete_test(
    db: Session,
    test_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """Delete a test. User can only delete their own tests."""
    test = db.query(Test).filter(
        Test.id == test_id,
        Test.user_id == user_id
    ).first()

    if not test:
        raise ValueError("Test not found or access denied")

    db.delete(test)
    db.commit()
    return True


def toggle_test_public(
    db: Session,
    test_id: uuid.UUID,
    user_id: uuid.UUID,
    make_public: bool
) -> dict:
    """Toggle test public/private status."""
    test = db.query(Test).filter(
        Test.id == test_id,
        Test.user_id == user_id
    ).first()

    if not test:
        raise ValueError("Test not found or access denied")

    test.is_public = make_public
    db.commit()
    db.refresh(test)

    return {
        "id": str(test.id),
        "is_public": test.is_public
    }


def get_test_stats(db: Session, user_id: uuid.UUID) -> dict:
    """Get comprehensive test statistics for a user."""
    from sqlalchemy import func

    total_tests = db.query(Test).filter(Test.user_id == user_id).count()
    completed_tests = db.query(Test).filter(
        Test.user_id == user_id,
        Test.completed == True
    ).count()

    attempts = db.query(TestAttempt).filter(TestAttempt.user_id == user_id).all()

    total_questions_answered = 0
    total_correct = 0
    total_wrong = 0
    total_empty = 0
    percentages = []

    for attempt in attempts:
        total_questions_answered += attempt.total_questions
        for ans in attempt.answers_snapshot or []:
            if ans.get("is_correct") is True:
                total_correct += 1
            elif ans.get("user_answer") is None:
                total_empty += 1
            else:
                total_wrong += 1
        percentages.append(attempt.percentage)

    avg_percentage = round(sum(percentages) / len(percentages)) if percentages else 0

    # Recent attempts for trend (last 10)
    recent_attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == user_id
    ).order_by(TestAttempt.created_at.desc()).limit(10).all()

    trend = []
    for att in reversed(recent_attempts):
        trend.append({
            "test_title": att.test.title if att.test else "",
            "percentage": att.percentage,
            "created_at": att.created_at.isoformat() if att.created_at else None
        })

    return {
        "total_tests": total_tests,
        "completed_tests": completed_tests,
        "total_questions_answered": total_questions_answered,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_empty": total_empty,
        "average_percentage": avg_percentage,
        "trend": trend
    }


def get_test_attempts(db: Session, test_id: uuid.UUID, user_id: uuid.UUID) -> list[dict]:
    """Get all attempts for a specific test."""
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise ValueError("Test not found")

    if test.user_id != user_id and not test.is_public:
        raise ValueError("Access denied")

    attempts = db.query(TestAttempt).filter(
        TestAttempt.test_id == test_id,
        TestAttempt.user_id == user_id
    ).order_by(TestAttempt.created_at.desc()).all()

    return [
        {
            "id": str(a.id),
            "score": a.score,
            "total_questions": a.total_questions,
            "percentage": a.percentage,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in attempts
    ]


EXPLAIN_SYSTEM_PROMPT = """Sen bir akademik eğitmen ve test analiz uzmanısın. Öğrencinin yanlış cevapladığı bir soruyu detaylı bir şekilde açıklıyorsun.

KURALLAR:
- Türkçe açıklama yap
- Öğrencinin verdiği cevabın neden yanlış olduğunu belirt
- Doğru cevabın neden doğru olduğunu belgedeki/konudaki bilgilerle destekle
- Konuyu tam olarak anlaması için ek bilgiler ver
- Gerekirse benzer örnekler ver
- Açıklama 3-5 cümle olmalı, net ve anlaşılır
- Markdown formatında yaz (kalın metinler, maddeler kullanabilirsin)"""


async def explain_question_with_ai(
    question_text: str,
    options: list[str],
    correct_answer: str,
    user_answer: str | None,
    explanation: str | None,
    document_content: str | None
) -> str:
    """Generate a detailed AI explanation for a test question."""
    if not deepseek_service.enabled:
        raise ValueError("DeepSeek service is not enabled")

    context = f"""SORU: {question_text}

SEÇENEKLER:
{chr(10).join(options)}

DOĞRU CEVAP: {correct_answer}

ÖĞRENCİNİN CEVABI: {user_answer or "Boş bırakıldı"}

MEVCUT AÇIKLAMA: {explanation or "Yok"}
"""

    if document_content:
        context += f"\n\nKAYNAK İÇERİK:\n{document_content[:8000]}"

    user_prompt = f"""Aşağıdaki soruyu öğrenciye detaylı bir şekilde açıkla. Öğrenci bu soruyu yanlış cevapladı (veya boş bıraktı).

{context}

Lütfen şu başlıklar altında açıkla:
1. **Doğru Cevap Neden Doğru?** — Doğru şıkkın neden doğru olduğunu detaylı anlat.
2. **Öğrencinin Cevabı Neden Yanlış?** — Öğrencinin işaretlediği şıkkın neden yanlış olduğunu anlat.
3. **Önemli Noktalar** — Bu konuyu tam anlaması için bilmesi gereken kritik noktalar.

Markdown formatında, başlıkları kalın (**Başlık**) olarak yaz."""

    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def _generate():
            response = deepseek_service.client.chat.completions.create(
                model=deepseek_service.model,
                messages=[
                    {"role": "system", "content": EXPLAIN_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2048
            )
            return response.choices[0].message.content

        result = await asyncio.wait_for(
            loop.run_in_executor(None, _generate),
            timeout=120.0
        )

        return result or "Açıklama oluşturulamadı."

    except asyncio.TimeoutError:
        raise ValueError("AI açıklama oluşturma zaman aşımına uğradı")
    except Exception as e:
        raise ValueError(f"AI açıklama oluşturulamadı: {str(e)}")
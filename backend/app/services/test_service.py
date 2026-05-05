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
from app.models.test import Test, TestQuestion
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


async def generate_test_questions(
    document_content: str,
    question_count: int
) -> list[dict]:
    """
    Generate test questions using DeepSeek AI.

    Args:
        document_content: Full text content from document
        question_count: Number of questions to generate

    Returns:
        List of question dictionaries with question_text, options, correct_answer, explanation
    """
    if not deepseek_service.enabled:
        raise ValueError("DeepSeek service is not enabled")

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
                max_tokens=4096
            )
            return response.choices[0].message.content

        result = await asyncio.wait_for(
            loop.run_in_executor(None, _generate),
            timeout=120.0
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

        parsed = json.loads(cleaned)

        if "questions" not in parsed or not isinstance(parsed["questions"], list):
            raise ValueError(f"Invalid AI response format: {result[:200]}")

        return parsed["questions"]

    except asyncio.TimeoutError:
        raise ValueError("AI timeout - test generation took too long")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from AI: {e}, response: {result[:500] if result else 'empty'}")
    except Exception as e:
        raise ValueError(f"Test generation failed: {str(e)}")


def create_test(
    db: Session,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    title: str,
    questions_data: list[dict],
    question_count: int
) -> Test:
    """Create a test with questions in the database."""
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
    db.refresh(test)
    return test


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

    answer_map = {uuid.UUID(a["question_id"]): a["answer"].upper() for a in answers}

    score = 0
    questions_with_results = []

    for question in sorted(test.questions, key=lambda q: q.order_num):
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
    test.total_questions = len(test.questions)
    test.completed = True
    test.completed_at = datetime.utcnow()

    db.commit()

    percentage = int((score / test.total_questions) * 100) if test.total_questions > 0 else 0

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

    questions = []
    for q in sorted(test.questions, key=lambda x: x.order_num):
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
        questions.append(q_dict)

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
        "questions": questions
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
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import hashlib
from app.services.pdf.extractor import detect_pdf_type

from app.db.database import get_db
from app.api import deps
from app.models.user import User
from app.models.tender import Tender, TenderDocument, DocumentPage
from app.schemas.tender import Tender as TenderSchema, TenderCreate, TenderUpdate
from app.workers.document_worker import process_document

router = APIRouter()

UPLOAD_DIR = "/uploads" if os.environ.get("DATABASE_URL") else "d:/TenderMind/uploads"

@router.get("/", response_model=List[TenderSchema])
def list_tenders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tenders = db.query(Tender).filter(Tender.user_id == current_user.id).offset(skip).limit(limit).all()
    return tenders

@router.post("/", response_model=TenderSchema, status_code=status.HTTP_201_CREATED)
def create_tender(
    tender_in: TenderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    new_tender = Tender(
        **tender_in.dict(),
        user_id=current_user.id
    )
    db.add(new_tender)
    db.commit()
    db.refresh(new_tender)
    return new_tender

@router.get("/{tender_id}", response_model=TenderSchema)
def get_tender(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender

@router.post("/{tender_id}/documents", status_code=status.HTTP_201_CREATED)
def upload_tender_document(
    tender_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    print(f"\\n--- UPLOAD START ---")
    print(f"tender_id: {tender_id}")
    print(f"filename: {file.filename}")
    print(f"content_type: {file.content_type}")
    
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        print(f"UPLOAD FAILED: tender ownership\\nexception: Tender not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Tender not found")
        
    print(f"AUTH SUCCESS\\nuser_id: {current_user.id}")
        
    if not file.filename.lower().endswith(".pdf"):
        print("UPLOAD FAILED: validation\\nexception: Not a .pdf extension")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    allowed_mime_types = ["application/pdf", "application/octet-stream"]
    if file.content_type not in allowed_mime_types:
        print(f"UPLOAD FAILED: validation\\nexception: Invalid file format {file.content_type}")
        raise HTTPException(status_code=415, detail=f"Invalid file format: {file.content_type}")
        
    print("FILE VALIDATION SUCCESS")
        
    # Read file content for hashing
    file_content = file.file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    file.file.seek(0)
        
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, f"tender_{tender_id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"FILE STORAGE SUCCESS\\npath: {file_path}")
    except Exception as e:
        print(f"UPLOAD FAILED: storage\\nexception: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save file to disk")
        
    pdf_type = detect_pdf_type(file_path)
    
    # Check if this exact file was already uploaded to this tender
    existing_doc = db.query(TenderDocument).filter(TenderDocument.file_hash == file_hash, TenderDocument.tender_id == tender_id).first()
    if existing_doc:
        return {"id": existing_doc.id, "filename": existing_doc.filename, "status": existing_doc.status, "message": "Duplicate document detected."}
        
    try:
        document = TenderDocument(
            tender_id=tender_id,
            filename=file.filename,
            storage_path=file_path,
            size_bytes=os.path.getsize(file_path),
            file_hash=file_hash,
            pdf_type=pdf_type,
            status="Uploaded" if pdf_type == "TEXT_PDF" else "OCR_REQUIRED"
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        print(f"DATABASE RECORD SUCCESS\\ndocument_id: {document.id}")
    except Exception as e:
        db.rollback()
        print(f"UPLOAD FAILED: database\\nexception: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save database record")
    
    # Trigger celery task
    if pdf_type == "TEXT_PDF":
        try:
            task = process_document.delay(document.id)
            print(f"CELERY TASK QUEUED\\ntask_id: {task.id}")
        except Exception as e:
            print(f"UPLOAD FAILED: celery enqueue\\nexception: {str(e)}")
            # We don't fail the upload if celery is down, just log it. 
            document.status = "Processing Failed"
            db.commit()
            
    # Invalidate existing summary and match cache
    try:
        from app.models.tender import TenderSummary
        db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id).delete()
        db.commit()
        from app.services.matching.cache import invalidate_tender_matches
        invalidate_tender_matches(tender_id)
    except Exception:
        pass
        
    print("UPLOAD COMPLETE")
    return {"id": document.id, "filename": document.filename, "status": document.status}

@router.get("/{tender_id}/documents")
def list_tender_documents(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    documents = db.query(TenderDocument).filter(TenderDocument.tender_id == tender_id).all()
    
    # Enrich with page count, chunks count if needed (optional)
    results = []
    for doc in documents:
        page_count = db.query(DocumentPage).filter(DocumentPage.document_id == doc.id).count()
        results.append({
            "id": doc.id,
            "filename": doc.filename,
            "status": doc.status,
            "size_bytes": doc.size_bytes,
            "page_count": page_count,
            "created_at": doc.created_at
        })
        
    return results

@router.get("/{tender_id}/documents/{document_id}/status")
def get_document_status(
    tender_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    document = db.query(TenderDocument).filter(TenderDocument.id == document_id, TenderDocument.tender_id == tender_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "document_id": document.id,
        "status": document.status,
        "stage": document.processing_stage or "QUEUED",
        "progress": document.processing_progress or 0,
        "message": document.processing_message or "",
        "failed_stage": document.failed_stage
    }

@router.delete("/{tender_id}/documents/{document_id}")
def delete_tender_document(
    tender_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    document = db.query(TenderDocument).filter(TenderDocument.id == document_id, TenderDocument.tender_id == tender_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        if os.path.exists(document.storage_path):
            os.remove(document.storage_path)
    except Exception as e:
        pass
        
    db.delete(document)
    db.commit()
    
    # Invalidate existing summary and match cache
    try:
        from app.models.tender import TenderSummary
        db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id).delete()
        db.commit()
        from app.services.matching.cache import invalidate_tender_matches
        invalidate_tender_matches(tender_id)
    except Exception:
        pass
    
    return {"status": "deleted"}

from app.models.tender import TenderSummary
from app.schemas.tender import TenderSummary as TenderSummarySchema

@router.post("/{tender_id}/summary", response_model=TenderSummarySchema, status_code=status.HTTP_201_CREATED)
def generate_summary(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    summary = db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id).first()
    if summary:
        if summary.status == "Completed":
            return summary
        # Re-generate by resetting status and fields
        db.query(TenderSummary).filter(TenderSummary.id == summary.id).delete()
        db.commit()
        
    new_summary = TenderSummary(tender_id=tender_id, status="Queued")
    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)
    
    from app.workers.document_worker import generate_tender_summary_task
    generate_tender_summary_task.delay(tender_id, new_summary.id)
    
    return new_summary

@router.get("/{tender_id}/summary", response_model=TenderSummarySchema)
def get_summary(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    summary = db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    return summary

from typing import List
from pydantic import BaseModel

class CompareRequest(BaseModel):
    tender_ids: List[int]

@router.post("/compare")
def compare_tenders(
    request: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if len(request.tender_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 tenders to compare.")
        
    tenders = db.query(Tender).filter(Tender.id.in_(request.tender_ids), Tender.user_id == current_user.id).all()
    if len(tenders) != len(request.tender_ids):
        raise HTTPException(status_code=404, detail="One or more tenders not found.")
        
    # We will build the comparison based on generated summaries to avoid a massive slow LLM context window
    summaries = db.query(TenderSummary).filter(TenderSummary.tender_id.in_(request.tender_ids), TenderSummary.status == 'Completed').all()
    
    if len(summaries) != len(request.tender_ids):
        raise HTTPException(status_code=400, detail="Please generate the Executive Summary for all selected tenders first before comparing.")
        
    # Ask LLM to compare based on the summaries
    from app.services.rag.generation import SYSTEM_PROMPT, settings
    import httpx, json
    
    context = ""
    for idx, summary in enumerate(summaries):
        tender = next(t for t in tenders if t.id == summary.tender_id)
        context += f"\n\n--- TENDER {idx+1}: {tender.title} ---\n"
        for field in summary.fields:
            if field.field_name in ["Tender Object / Purpose", "Estimated Tender Value", "Contract Duration", "Bid Submission Deadline", "Eligibility Summary", "Key Technical Requirements"]:
                context += f"{field.field_name}: {field.extracted_value}\n"
                
    prompt = f"""Based on the following tender summaries, provide a detailed comparative analysis.
{context}

Format your response as a valid JSON object with a single key 'matrix' containing an array of objects.
Each object should have:
- 'criteria': The aspect being compared (e.g., 'Estimated Value', 'Deadline', 'Technical Requirements', 'Eligibility')
- 'tender_1': The value for the first tender
- 'tender_2': The value for the second tender
(Add 'tender_3', etc. if there are more than 2)

JSON ONLY. NO MARKDOWN. NO EXPLANATION."""

    from app.core.config import settings as _settings
    _groq_headers = {
        "Authorization": f"Bearer {_settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    _groq_payload = {
        "model": _settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON generator. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }

    try:
        import time as _time
        last_exc = None
        for attempt in range(3):
            try:
                response = httpx.post(_settings.GROQ_API_URL, headers=_groq_headers, json=_groq_payload, timeout=60.0)
                if response.status_code == 429:
                    retry_after = int(response.headers.get("retry-after", "5"))
                    _time.sleep(min(retry_after, 10))
                    last_exc = Exception(f"429 rate limit")
                    continue
                response.raise_for_status()
                break
            except Exception as e:
                last_exc = e
                if attempt < 2:
                    _time.sleep(3)
        else:
            raise last_exc

        answer = response.json()["choices"][0]["message"]["content"].strip()
        comparison_data = json.loads(answer)
        
        # Format columns for the frontend
        columns = [{"id": "criteria", "name": "Criteria"}]
        for idx, t in enumerate(tenders):
            columns.append({"id": f"tender_{idx+1}", "name": t.title})
            
        return {
            "columns": columns,
            "matrix": comparison_data.get("matrix", [])
        }
    except Exception as e:
        print(f"Compare Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run comparison: {str(e)}")

@router.post("/{tender_id}/match")
def match_company(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    summary = db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id, TenderSummary.status == 'Completed').first()
    if not summary:
        raise HTTPException(status_code=400, detail="Please generate the Executive Summary for this tender first.")
        
    from app.models.company import Company
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company profile not found.")
        
    from app.services.matching.cache import get_match_cache, save_match_cache
    cached_match = get_match_cache(tender_id, company.id)
    if cached_match:
        return cached_match
        
    from app.services.matching.deterministic import run_deterministic_checks
    matches = run_deterministic_checks(company, summary.fields)
    
    # Check Technical requirements
    tech_reqs = [f for f in summary.fields if f.field_name == "Key Technical Requirements"]
    if tech_reqs and tech_reqs[0].extracted_value and tech_reqs[0].extracted_value != "Not specified in uploaded documents.":
        # Build strict company context
        company_context = f"Company Name: {company.name}\nIndustry: {company.industry}\nDescription: {company.description}\n"
        company_context += "\n--- PROJECTS ---\n"
        for p in company.projects:
            company_context += f"Project: {p.project_name}, Desc: {p.description}, Category: {p.project_category}\n"
        company_context += "\n--- TEAM ---\n"
        for t in company.team_members:
            company_context += f"Name: {t.name}, Role: {t.designation}, Skills: {t.skills}\n"
        company_context += "\n--- DOCUMENTS ---\n"
        for d in company.documents:
            company_context += f"Doc Name: {d.filename}, Type: {d.document_type}\n"
            
        prompt = f"""You are an expert Tender Analyst.
We need to check the company's technical capabilities against the tender's technical requirements.

TENDER TECHNICAL REQUIREMENTS:
{tech_reqs[0].extracted_value}

COMPANY DATA:
{company_context}

RULES:
1. ONLY mark a requirement '✓ Appears Satisfied' if there is EXPLICIT evidence in the COMPANY DATA.
2. If company evidence is missing, incomplete, or requires human check, use '⚠ Needs Verification'. DO NOT mark it satisfied simply because it exists in the tender.
3. If company data explicitly contradicts the requirement, use '✗ Appears Unmet'.

Return a JSON array of objects strictly in this format:
[
  {{
    "category": "Technical",
    "description": "Daily backups and documented recovery procedures.",
    "status": "⚠ Needs Verification",
    "reason": "No company evidence was found documenting daily backups and recovery procedures.",
    "evidence": "No supporting company evidence found."
  }}
]
Do NOT return the 'score' key. ONLY return a JSON array. NO MARKDOWN."""

        from app.core.config import settings as _s
        import httpx, json

        _gh = {"Authorization": f"Bearer {_s.GROQ_API_KEY}", "Content-Type": "application/json"}
        _gp = {
            "model": _s.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are a JSON generator. Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 1024,
            "response_format": {"type": "json_object"},
        }

        try:
            response = httpx.post(_s.GROQ_API_URL, headers=_gh, json=_gp, timeout=60.0)
            response.raise_for_status()
            answer = response.json()["choices"][0]["message"]["content"].strip()
            if answer.startswith("{") and "matches" in answer:
                parsed = json.loads(answer)
                tech_matches = parsed.get("matches", [])
            else:
                tech_matches = json.loads(answer)
                
            if isinstance(tech_matches, dict):
                tech_matches = [tech_matches]
            elif not isinstance(tech_matches, list):
                tech_matches = []
                
            matches.extend(tech_matches)
        except Exception as e:
            print(f"Technical Match Error: {e}")
            
    # Calculate overall match score from actual matching
    if not matches:
        return {"score": 0, "matches": []}
        
    satisfied = sum(1 for m in matches if m.get("status") == "✓ Appears Satisfied")
    score = int((satisfied / len(matches)) * 100)
    
    final_result = {
        "score": score,
        "matches": matches
    }
    save_match_cache(tender_id, company.id, final_result)
    return final_result

@router.delete("/{tender_id}", status_code=status.HTTP_200_OK)
def delete_tender(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    if tender.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tender")

    # 1. Delete associated physical files
    documents = db.query(TenderDocument).filter(TenderDocument.tender_id == tender_id).all()
    for doc in documents:
        try:
            if os.path.exists(doc.storage_path):
                os.remove(doc.storage_path)
        except Exception:
            pass

    # 2. Delete Vector/BM25 index files
    # Base dirs
    FAISS_INDEX_DIR = "/data/faiss" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/faiss"
    BM25_INDEX_DIR = "/data/bm25" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/bm25"
    
    index_files = [
        os.path.join(FAISS_INDEX_DIR, f"tender_{tender_id}.faiss"),
        os.path.join(FAISS_INDEX_DIR, f"tender_{tender_id}_meta.pkl"),
        os.path.join(BM25_INDEX_DIR, f"tender_{tender_id}_vectorizer.pkl"),
        os.path.join(BM25_INDEX_DIR, f"tender_{tender_id}_vectors.pkl"),
        os.path.join(BM25_INDEX_DIR, f"tender_{tender_id}_meta.pkl"),
    ]
    for idx_file in index_files:
        try:
            if os.path.exists(idx_file):
                os.remove(idx_file)
        except Exception:
            pass

    # 3. Explicitly delete child models without cascade="all, delete-orphan" from Tender directly
    
    # Chat models
    from app.models.chat import ChatSession
    chat_sessions = db.query(ChatSession).filter(ChatSession.tender_id == tender_id).all()
    for cs in chat_sessions:
        db.delete(cs)
        
    # TenderSummary
    from app.models.tender import TenderSummary
    summary = db.query(TenderSummary).filter(TenderSummary.tender_id == tender_id).first()
    if summary:
        db.delete(summary)
        
    try:
        # Flush the session to issue the DELETE statements for ChatSession and TenderSummary
        # BEFORE we delete the tender, because there is no SQLAlchemy relationship telling it the order.
        db.flush()
        
        # Then delete the tender (cascade will handle TenderDocument, DocumentPage, DocumentChunk, TenderSummaryField)
        db.delete(tender)
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")

    return {"message": "Tender deleted successfully"}

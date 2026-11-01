from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.db.database import get_db
from app.api import deps
from app.models.user import User
from app.models.tender import TenderDocument, Tender

router = APIRouter()

@router.get("/{document_id}")
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    document = db.query(TenderDocument).filter(TenderDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    tender = db.query(Tender).filter(Tender.id == document.tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    return document

@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    document = db.query(TenderDocument).filter(TenderDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    tender = db.query(Tender).filter(Tender.id == document.tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    if not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        path=document.storage_path, 
        media_type="application/pdf", 
        filename=document.filename
    )

@router.get("/{document_id}/download")
def download_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    document = db.query(TenderDocument).filter(TenderDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    tender = db.query(Tender).filter(Tender.id == document.tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    if not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        path=document.storage_path, 
        media_type="application/pdf", 
        filename=document.filename,
        content_disposition_type="attachment"
    )

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TenderDocumentBase(BaseModel):
    filename: str
    document_type: Optional[str] = None
    size_bytes: Optional[int] = None
    status: Optional[str] = "Uploaded"

class TenderDocument(TenderDocumentBase):
    id: int
    tender_id: int
    storage_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TenderBase(BaseModel):
    title: str
    reference_number: Optional[str] = None
    issuing_organization: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    publication_date: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    status: Optional[str] = "Uploaded"

class TenderCreate(TenderBase):
    pass

class TenderUpdate(TenderBase):
    title: Optional[str] = None

class Tender(TenderBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    documents: List[TenderDocument] = []
    
    class Config:
        from_attributes = True

class TenderSummaryFieldBase(BaseModel):
    field_name: str
    extracted_value: Optional[str] = None
    source_document: Optional[str] = None
    page_number: Optional[str] = None
    evidence: Optional[str] = None

class TenderSummaryField(TenderSummaryFieldBase):
    id: int
    summary_id: int
    
    class Config:
        from_attributes = True

class TenderSummaryBase(BaseModel):
    tender_id: int
    status: str

class TenderSummary(TenderSummaryBase):
    id: int
    created_at: datetime
    fields: List[TenderSummaryField] = []
    
    class Config:
        from_attributes = True

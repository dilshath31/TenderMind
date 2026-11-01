from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    reference_number = Column(String)
    issuing_organization = Column(String)
    category = Column(String)
    location = Column(String)
    description = Column(Text)
    publication_date = Column(DateTime(timezone=True))
    submission_deadline = Column(DateTime(timezone=True))
    status = Column(String, default="Uploaded")  # Uploaded, Processing, Ready, Analysis Available, Archived, Processing Failed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")
    documents = relationship("TenderDocument", back_populates="tender", cascade="all, delete-orphan")

class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    filename = Column(String, nullable=False)
    document_type = Column(String) # Main, Technical, Financial, Corrigendum, etc.
    size_bytes = Column(Integer)
    storage_path = Column(String, nullable=False)
    file_hash = Column(String, index=True) # For deduplication
    pdf_type = Column(String) # TEXT_PDF, SCANNED_PDF
    status = Column(String, default="Uploaded")
    
    processing_stage = Column(String, default="QUEUED")
    processing_progress = Column(Integer, default=0)
    processing_message = Column(String)
    failed_stage = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tender = relationship("Tender", back_populates="documents")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("tender_documents.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    text_content = Column(Text)
    
    document = relationship("TenderDocument", back_populates="pages")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("tender_documents.id"), nullable=False)
    page_number = Column(Integer)
    chunk_index = Column(Integer, nullable=False)
    chunk_id = Column(String, index=True)
    text_content = Column(Text, nullable=False)
    section = Column(String)
    
    document = relationship("TenderDocument", back_populates="chunks")

class TenderSummary(Base):
    __tablename__ = "tender_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, unique=True)
    status = Column(String, default="Generating") # Generating, Completed, Failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    fields = relationship("TenderSummaryField", back_populates="summary", cascade="all, delete-orphan")

class TenderSummaryField(Base):
    __tablename__ = "tender_summary_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(Integer, ForeignKey("tender_summaries.id"), nullable=False)
    field_name = Column(String, nullable=False)
    extracted_value = Column(Text)
    source_document = Column(String)
    page_number = Column(String)
    evidence = Column(Text)
    
    summary = relationship("TenderSummary", back_populates="fields")

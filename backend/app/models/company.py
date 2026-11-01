from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    company_type = Column(String)
    industry = Column(String)
    description = Column(Text)
    website = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)

    # ── Financial / eligibility fields ──────────────────────────────────
    founded_year        = Column(Integer)           # e.g. 2010
    annual_turnover_cr  = Column(Float)             # in Crore INR, e.g. 5.2
    net_worth_cr        = Column(Float)             # in Crore INR
    solvency_amount_cr  = Column(Float)             # bank solvency in Crore INR
    num_employees       = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")
    registrations = relationship("CompanyRegistration", back_populates="company", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="company", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="company", cascade="all, delete-orphan")
    team_members = relationship("TeamMember", back_populates="company", cascade="all, delete-orphan")
    documents = relationship("CompanyDocument", back_populates="company", cascade="all, delete-orphan")

class CompanyRegistration(Base):
    __tablename__ = "company_registrations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    gst = Column(String)
    pan = Column(String)
    registration_number = Column(String)
    other_details = Column(String)
    
    company = relationship("Company", back_populates="registrations")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    project_name = Column(String, nullable=False)
    client = Column(String)
    project_value = Column(Float)
    start_date = Column(Date)
    end_date = Column(Date)
    description = Column(String)
    project_category = Column(String)
    
    company = relationship("Company", back_populates="projects")

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    certification_name = Column(String, nullable=False)
    issuing_organization = Column(String)
    certificate_number = Column(String)
    issue_date = Column(Date)
    expiry_date = Column(Date)
    document_path = Column(String)
    
    company = relationship("Company", back_populates="certifications")

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    designation = Column(String)
    qualification = Column(String)
    experience_years = Column(Float)
    skills = Column(String)
    
    company = relationship("Company", back_populates="team_members")

class CompanyDocument(Base):
    __tablename__ = "company_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    filename = Column(String, nullable=False)
    document_type = Column(String)  # GST, PAN, Experience, etc.
    size_bytes = Column(Integer)
    storage_path = Column(String, nullable=False)
    status = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company = relationship("Company", back_populates="documents")

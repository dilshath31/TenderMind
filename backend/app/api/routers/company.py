from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api import deps
from app.models.user import User
from app.models.company import Company, CompanyRegistration, Project, Certification, TeamMember
from app.schemas.company import (
    Company as CompanySchema, CompanyCreate, CompanyUpdate,
    Project as ProjectSchema, ProjectCreate,
    CompanyRegistration as RegSchema, CompanyRegistrationCreate,
)
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()

# ── Certification schemas (inline, not in schemas file yet) ──────────────────
class CertificationBase(BaseModel):
    certification_name: str
    issuing_organization: Optional[str] = None
    certificate_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

class CertificationCreate(CertificationBase):
    pass

class CertificationOut(CertificationBase):
    id: int
    company_id: int
    class Config:
        from_attributes = True

# ── Team member schemas ───────────────────────────────────────────────────────
class TeamMemberBase(BaseModel):
    name: str
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[float] = None
    skills: Optional[str] = None

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberOut(TeamMemberBase):
    id: int
    company_id: int
    class Config:
        from_attributes = True

# ── helpers ───────────────────────────────────────────────────────────────────
def _get_company(db: Session, user: User) -> Company:
    c = db.query(Company).filter(Company.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    return c

# ── Company CRUD ──────────────────────────────────────────────────────────────
@router.get("", response_model=CompanySchema)
def get_my_company(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    return _get_company(db, current_user)

@router.post("", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
def create_company(company_in: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    if db.query(Company).filter(Company.user_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="User already has a company profile")
    new_company = Company(**company_in.dict(), user_id=current_user.id)
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company

@router.put("", response_model=CompanySchema)
def update_company(company_in: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    for field, value in company_in.dict(exclude_unset=True).items():
        setattr(company, field, value)
    db.add(company)
    db.commit()
    db.refresh(company)
    from app.services.matching.cache import invalidate_company_matches
    invalidate_company_matches(company.id)
    return company

# ── Projects ──────────────────────────────────────────────────────────────────
@router.get("/projects", response_model=List[ProjectSchema])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    return company.projects

@router.post("/projects", response_model=ProjectSchema, status_code=201)
def add_project(project_in: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    proj = Project(**project_in.dict(), company_id=company.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    proj = db.query(Project).filter(Project.id == project_id, Project.company_id == company.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()

# ── Certifications ────────────────────────────────────────────────────────────
@router.get("/certifications", response_model=List[CertificationOut])
def list_certifications(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    return company.certifications

@router.post("/certifications", response_model=CertificationOut, status_code=201)
def add_certification(cert_in: CertificationCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    cert = Certification(**cert_in.dict(), company_id=company.id)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

@router.delete("/certifications/{cert_id}", status_code=204)
def delete_certification(cert_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    cert = db.query(Certification).filter(Certification.id == cert_id, Certification.company_id == company.id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(cert)
    db.commit()

# ── Team Members ──────────────────────────────────────────────────────────────
@router.get("/team", response_model=List[TeamMemberOut])
def list_team(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    return company.team_members

@router.post("/team", response_model=TeamMemberOut, status_code=201)
def add_team_member(member_in: TeamMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    member = TeamMember(**member_in.dict(), company_id=company.id)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.delete("/team/{member_id}", status_code=204)
def delete_team_member(member_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    member = db.query(TeamMember).filter(TeamMember.id == member_id, TeamMember.company_id == company.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    db.delete(member)
    db.commit()

# ── Registrations upsert ──────────────────────────────────────────────────────
class RegistrationUpsert(BaseModel):
    gst: Optional[str] = None
    pan: Optional[str] = None
    registration_number: Optional[str] = None
    other_details: Optional[str] = None

@router.post("/registrations", status_code=201)
def create_registration(reg_in: RegistrationUpsert, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    reg = CompanyRegistration(**reg_in.dict(), company_id=company.id)
    db.add(reg); db.commit(); db.refresh(reg)
    return reg

@router.put("/registrations/{reg_id}")
def update_registration(reg_id: int, reg_in: RegistrationUpsert, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    company = _get_company(db, current_user)
    reg = db.query(CompanyRegistration).filter(CompanyRegistration.id == reg_id, CompanyRegistration.company_id == company.id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    for f, v in reg_in.dict(exclude_unset=True).items():
        setattr(reg, f, v)
    db.commit(); db.refresh(reg)
    return reg

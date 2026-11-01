from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class CompanyRegistrationBase(BaseModel):
    gst: Optional[str] = None
    pan: Optional[str] = None
    registration_number: Optional[str] = None
    other_details: Optional[str] = None

class CompanyRegistrationCreate(CompanyRegistrationBase):
    pass

class CompanyRegistration(CompanyRegistrationBase):
    id: int
    company_id: int
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    project_name: str
    client: Optional[str] = None
    project_value: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    project_category: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    company_id: int
    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str
    company_type: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    # Financial / eligibility fields
    founded_year:       Optional[int]   = None
    annual_turnover_cr: Optional[float] = None
    net_worth_cr:       Optional[float] = None
    solvency_amount_cr: Optional[float] = None
    num_employees:      Optional[int]   = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    name: Optional[str] = None

class Company(CompanyBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    registrations: List[CompanyRegistration] = []
    projects: List[Project] = []
    
    class Config:
        from_attributes = True

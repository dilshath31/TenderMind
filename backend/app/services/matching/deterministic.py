"""
Deterministic eligibility checker.
Uses proper company model fields (annual_turnover_cr, founded_year, etc.)
rather than trying to regex-parse free text.
"""
import re
from datetime import date
from typing import List, Dict, Any


# ── helpers ────────────────────────────────────────────────────────────────────
def _cr(text: str):
    """Extract a crore amount from a string.  Returns float or None."""
    if not text:
        return None
    m = re.search(r'(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)\s*(?:cr(?:ore)?|lakh\s*x100)', text.lower())
    if m:
        return float(m.group(1))
    # also handle plain numbers followed by "crore"
    m = re.search(r'(\d+(?:\.\d+)?)\s*crore', text.lower())
    return float(m.group(1)) if m else None


def _years(text: str):
    """Extract year count from a string.  Returns float or None."""
    if not text:
        return None
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:year|yrs|yr)', text.lower())
    return float(m.group(1)) if m else None


def _check(description: str, category: str, status: str, reason: str, evidence: str) -> Dict:
    return {
        "category": category,
        "description": description,
        "status": status,
        "reason": reason,
        "evidence": evidence,
    }


def _sat(desc, cat, reason, evidence="Company Profile"):
    return _check(desc, cat, "✓ Appears Satisfied", reason, evidence)


def _unmet(desc, cat, reason, evidence="Company Profile"):
    return _check(desc, cat, "✗ Appears Unmet", reason, evidence)


def _verify(desc, cat, reason):
    return _check(desc, cat, "⚠ Needs Verification", reason, "Not provided in company profile")


# ── main ───────────────────────────────────────────────────────────────────────
def run_deterministic_checks(company, summary_fields) -> List[Dict[str, Any]]:
    matches: List[Dict[str, Any]] = []

    # ── flatten tender fields ──────────────────────────────────────────────────
    eligibility_text = ""
    docs_text = ""
    for f in summary_fields:
        if f.field_name == "Eligibility Summary":
            eligibility_text = f.extracted_value or ""
        elif f.field_name == "Important Submission Documents":
            docs_text = f.extracted_value or ""

    combined = (eligibility_text + " " + docs_text).lower()

    # ── company facts ─────────────────────────────────────────────────────────
    current_year = date.today().year

    # Years in business
    comp_years: float | None = None
    if company.founded_year:
        comp_years = float(current_year - company.founded_year)

    # Annual turnover
    comp_turnover: float | None = company.annual_turnover_cr  # Crore INR

    # Net worth
    comp_net_worth: float | None = company.net_worth_cr

    # Solvency
    comp_solvency: float | None = company.solvency_amount_cr

    # Projects
    comp_projects = company.projects or []
    num_projects = len(comp_projects)
    max_proj_val = max((p.project_value for p in comp_projects if p.project_value), default=0.0)

    # Registrations
    has_gst = any(r.gst and r.gst.strip() for r in (company.registrations or []))
    has_pan = any(r.pan and r.pan.strip() for r in (company.registrations or []))

    # Also check company documents for GST/PAN
    doc_types = [(d.document_type or "").lower() for d in (company.documents or [])]
    if not has_gst:
        has_gst = any("gst" in dt for dt in doc_types)
    if not has_pan:
        has_pan = any("pan" in dt for dt in doc_types)

    # Certifications
    cert_names = [(c.certification_name or "").lower() for c in (company.certifications or [])]
    has_iso9001  = any("9001" in c for c in cert_names)
    has_iso27001 = any("27001" in c for c in cert_names)
    has_cmmi     = any("cmmi" in c for c in cert_names)

    # ── 1. Years of experience ────────────────────────────────────────────────
    req_exp = _years(eligibility_text) or (5.0 if "experience" in combined or "years" in combined else None)
    if req_exp:
        desc = f"Minimum {req_exp:.0f} years business experience"
        if comp_years is not None:
            if comp_years >= req_exp:
                matches.append(_sat(desc, "Experience",
                    f"Company was founded in {company.founded_year}, giving {comp_years:.0f} years of experience — meets the {req_exp:.0f}-year requirement."))
            else:
                matches.append(_unmet(desc, "Experience",
                    f"Company has {comp_years:.0f} years experience (founded {company.founded_year}), below the required {req_exp:.0f} years."))
        else:
            matches.append(_verify(desc, "Experience",
                "Founded year not set in company profile. Add it under Company Profile → General Info."))

    # ── 2. Annual Turnover ────────────────────────────────────────────────────
    req_to = _cr(eligibility_text) or (3.0 if "turnover" in combined else None)
    if req_to:
        desc = f"Average annual turnover ≥ ₹{req_to:.1f} crore"
        if comp_turnover is not None:
            if comp_turnover >= req_to:
                matches.append(_sat(desc, "Financial",
                    f"Company annual turnover is ₹{comp_turnover:.2f} crore, which meets the ₹{req_to:.1f} crore requirement."))
            else:
                matches.append(_unmet(desc, "Financial",
                    f"Company turnover ₹{comp_turnover:.2f} crore is below the required ₹{req_to:.1f} crore."))
        else:
            matches.append(_verify(desc, "Financial",
                "Annual turnover not provided. Add it under Company Profile → General Info → Financial Details."))

    # ── 3. Net Worth ──────────────────────────────────────────────────────────
    if "net worth" in combined or "networth" in combined:
        req_nw = _cr(eligibility_text) or 1.0
        desc = f"Positive net worth ≥ ₹{req_nw:.1f} crore"
        if comp_net_worth is not None:
            if comp_net_worth >= req_nw:
                matches.append(_sat(desc, "Financial",
                    f"Company net worth ₹{comp_net_worth:.2f} crore satisfies the requirement."))
            else:
                matches.append(_unmet(desc, "Financial",
                    f"Company net worth ₹{comp_net_worth:.2f} crore is below the required ₹{req_nw:.1f} crore."))
        else:
            matches.append(_verify(desc, "Financial",
                "Net worth not provided. Add it under Company Profile → General Info → Financial Details."))

    # ── 4. Number of completed projects ──────────────────────────────────────
    if "project" in combined or "completed" in combined:
        m = re.search(r'(\d+)\s*(?:relevant|completed|qualifying|similar)?\s*(?:work|project)', combined)
        req_proj = int(m.group(1)) if m else 2
        desc = f"At least {req_proj} relevant completed projects"
        if num_projects >= req_proj:
            matches.append(_sat(desc, "Experience",
                f"Company has {num_projects} projects recorded — meets the {req_proj}-project requirement.", "Company Projects"))
        elif num_projects > 0:
            matches.append(_unmet(desc, "Experience",
                f"Company has only {num_projects} project(s); tender requires {req_proj}.", "Company Projects"))
        else:
            matches.append(_verify(desc, "Experience",
                "No projects added. Add them under Company Profile → Experience."))

    # ── 5. Project value ─────────────────────────────────────────────────────
    if "similar work" in combined or "project value" in combined or "each project" in combined:
        m = re.search(r'(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)\s*(?:cr(?:ore)?|lakh)', combined)
        req_pv = float(m.group(1)) if m else 1.5
        desc = f"Qualifying project value ≥ ₹{req_pv:.1f} crore"
        if max_proj_val >= req_pv:
            matches.append(_sat(desc, "Experience",
                f"Company has a project valued ₹{max_proj_val:.2f} crore — meets the ₹{req_pv:.1f} crore requirement.", "Company Projects"))
        elif max_proj_val > 0:
            matches.append(_unmet(desc, "Experience",
                f"Highest project value ₹{max_proj_val:.2f} crore is below the required ₹{req_pv:.1f} crore.", "Company Projects"))
        else:
            matches.append(_verify(desc, "Experience",
                "No project values entered. Add project values under Company Profile → Experience."))

    # ── 6. GST ────────────────────────────────────────────────────────────────
    if "gst" in combined:
        desc = "Valid GST registration"
        if has_gst:
            matches.append(_sat(desc, "Documentation",
                "GST number found in company registrations.", "Company Registrations"))
        else:
            matches.append(_verify(desc, "Documentation",
                "GST number not entered. Add it under Company Profile → Registrations."))

    # ── 7. PAN ────────────────────────────────────────────────────────────────
    if "pan" in combined:
        desc = "Valid PAN card"
        if has_pan:
            matches.append(_sat(desc, "Documentation",
                "PAN found in company registrations.", "Company Registrations"))
        else:
            matches.append(_verify(desc, "Documentation",
                "PAN not entered. Add it under Company Profile → Registrations."))

    # ── 8. ISO 9001 ───────────────────────────────────────────────────────────
    if "9001" in combined:
        desc = "ISO 9001:2015 Quality Management certification"
        if has_iso9001:
            matches.append(_sat(desc, "Certification",
                "ISO 9001 certification found in company certifications.", "Company Certifications"))
        else:
            matches.append(_verify(desc, "Certification",
                "ISO 9001 not found. Add it under Company Profile → Certifications."))

    # ── 9. ISO 27001 ──────────────────────────────────────────────────────────
    if "27001" in combined:
        desc = "ISO/IEC 27001:2013 Information Security certification"
        if has_iso27001:
            matches.append(_sat(desc, "Certification",
                "ISO 27001 certification found in company certifications.", "Company Certifications"))
        else:
            matches.append(_verify(desc, "Certification",
                "ISO 27001 not found. Add it under Company Profile → Certifications."))

    # ── 10. CMMI ──────────────────────────────────────────────────────────────
    if "cmmi" in combined:
        desc = "CMMI Level 3 or above"
        if has_cmmi:
            matches.append(_sat(desc, "Certification",
                "CMMI certification found in company certifications.", "Company Certifications"))
        else:
            matches.append(_verify(desc, "Certification",
                "CMMI not found. Add it under Company Profile → Certifications."))

    # ── 11. Bank Solvency ─────────────────────────────────────────────────────
    if "solvency" in combined:
        m2 = re.search(r'solvency.*?(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)\s*(?:cr(?:ore)?|lakh)', combined)
        req_sol = float(m2.group(1)) if m2 else 4.0
        desc = f"Bank solvency certificate ≥ ₹{req_sol:.1f} crore"
        if comp_solvency is not None:
            if comp_solvency >= req_sol:
                matches.append(_sat(desc, "Financial",
                    f"Company solvency ₹{comp_solvency:.1f} crore meets the requirement.", "Company Profile"))
            else:
                matches.append(_unmet(desc, "Financial",
                    f"Solvency ₹{comp_solvency:.1f} crore is below the required ₹{req_sol:.1f} crore."))
        else:
            matches.append(_verify(desc, "Financial",
                "Solvency amount not provided. Add it under Company Profile → General Info → Financial Details."))

    # ── 12. Number of employees ───────────────────────────────────────────────
    if "employee" in combined or "staff" in combined or "personnel" in combined:
        m3 = re.search(r'(\d+)\s*(?:full.?time|technical)?\s*(?:employee|staff|personnel)', combined)
        req_emp = int(m3.group(1)) if m3 else 10
        desc = f"Minimum {req_emp} technical employees"
        comp_emp = company.num_employees or len(company.team_members or [])
        if comp_emp >= req_emp:
            matches.append(_sat(desc, "Technical",
                f"Company has {comp_emp} employees/team members on record, meeting the {req_emp} minimum.", "Company Profile"))
        elif comp_emp > 0:
            matches.append(_unmet(desc, "Technical",
                f"Company shows {comp_emp} employees, below the required {req_emp}."))
        else:
            matches.append(_verify(desc, "Technical",
                "Employee count not provided. Add it under Company Profile → General Info or add Team members."))

    return matches

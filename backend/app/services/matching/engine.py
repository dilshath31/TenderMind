import json
import httpx
from typing import Dict, Any, List
from app.core.config import settings
from app.models.company import Company
from app.models.tender import Tender


def _call_groq_json(system_prompt: str, user_prompt: str) -> str:
    """Call Groq API in JSON mode and return raw response text."""
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        raise ValueError("GROQ_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }
    response = httpx.post(settings.GROQ_API_URL, headers=headers, json=payload, timeout=60.0)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def match_company_to_requirements(
    company: Company, requirements: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Compares the company profile against extracted requirements using Groq.
    """
    # Build company context text
    company_context = (
        f"Company Name: {company.name}\n"
        f"Industry: {company.industry}\n"
        f"Description: {company.description}\n\n"
    )
    company_context += "PROJECT EXPERIENCE:\n"
    for proj in company.projects:
        company_context += f"- {proj.project_name} (Value: {proj.project_value}): {proj.description}\n"

    company_context += "\nCERTIFICATIONS:\n"
    for cert in company.certifications:
        company_context += f"- {cert.certification_name} from {cert.issuing_organization}\n"

    system_prompt = """You are an expert Tender Compliance Matcher.
Compare the given Company Profile against the provided Tender Requirements.
For EACH requirement, determine the compliance status based ONLY on the company profile.

Return a JSON object with a single key "matches" containing an array of objects, each with:
- "requirement_description": string
- "status": exactly one of ["✓ Appears Satisfied", "⚠ Needs Verification", "✗ Appears Unmet"]
- "reason": explain what the company has and why it matches or fails
- "evidence": specific part of the company profile used as evidence

Output valid JSON only — no markdown, no extra text."""

    reqs_text = "\n".join(
        [f"- [{r.get('category', 'General')}] {r.get('description', '')}" for r in requirements]
    )
    user_prompt = f"COMPANY PROFILE:\n{company_context}\n\nREQUIREMENTS TO CHECK:\n{reqs_text}"

    try:
        raw = _call_groq_json(system_prompt, user_prompt)
        data = json.loads(raw)
        # Unwrap the "matches" key that JSON mode forces us to use
        match_results = data.get("matches", data) if isinstance(data, dict) else data
        if isinstance(match_results, list):
            return match_results
        return []
    except Exception as e:
        print(f"Groq matching failed: {e}")
        return []

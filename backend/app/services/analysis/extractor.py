import json
import httpx
from typing import List, Dict, Any
from app.core.config import settings


def _call_groq_json(system_prompt: str, user_prompt: str) -> str:
    """Helper: call Groq API in JSON mode and return the raw text response."""
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


def extract_requirements_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Calls Groq to extract structured requirements from a tender text chunk.
    Returns a list of requirement dictionaries.
    """
    system_prompt = """You are an expert Tender Requirement Extraction AI.
Extract structured requirements from the provided tender text.
Identify conditions related to:
- Eligibility
- Experience
- Financial (Turnover, Net Worth, etc.)
- Technical Capabilities
- Certifications

Respond ONLY with a valid JSON object containing a single key "requirements" whose value
is a list of objects. Each object must have:
- "category": e.g. 'Eligibility', 'Financial', 'Experience', 'Technical'
- "description": the textual requirement
- "condition": e.g. 'Minimum 5 years', '> 1.60 crore'

If there are no clear requirements, return {"requirements": []}.
Do NOT wrap the JSON in markdown code blocks."""

    user_prompt = f"Extract requirements from this text:\n\n{text}"

    try:
        raw = _call_groq_json(system_prompt, user_prompt)

        # Groq JSON mode always returns a JSON object — unwrap the list from the wrapper key
        data = json.loads(raw)
        requirements = data.get("requirements", data) if isinstance(data, dict) else data

        if isinstance(requirements, list):
            return requirements
        return []

    except Exception as e:
        print(f"Groq requirement extraction failed: {e}")
        return []

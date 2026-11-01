import json
import httpx
from typing import List, Dict, Any
from app.core.config import settings
from app.services.retrieval.hybrid import hybrid_search

SYSTEM_PROMPT = """You are TenderMind AI, an expert assistant for analyzing tender documents.

There are two types of messages:
A. Normal conversation — respond naturally and briefly.
B. Tender / document questions — answer ONLY from the supplied context.

Rules for tender questions:
- Never invent or guess tender facts not present in the context.
- Preserve exact numbers, dates, names, requirements and conditions from the context.
- If the information is not in the context, say exactly:
  "The requested information is not available in the uploaded tender documents."
- When evidence is available, answer directly and clearly.
"""


def _call_groq(messages: List[Dict[str, str]], temperature: float = 0.2, json_mode: bool = False) -> str:
    """Call Groq API with automatic retry on 429 rate-limit."""
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        raise ValueError("GROQ_API_KEY is not configured. Please set it in your .env file.")

    import time as _time

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    last_exc: Exception = Exception("unknown")
    for attempt in range(3):
        try:
            response = httpx.post(settings.GROQ_API_URL, headers=headers, json=payload, timeout=60.0)
            if response.status_code == 429:
                wait = int(response.headers.get("retry-after", "5"))
                _time.sleep(min(wait, 15))
                last_exc = Exception("429 rate limit")
                continue
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            last_exc = e
            if attempt < 2:
                _time.sleep(3)
    raise last_exc


def generate_rag_response(
    tender_id: int,
    query: str,
    chat_history: List[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Main RAG pipeline: retrieve → build messages → call Groq."""

    # 1. Detect pure conversational turns (no retrieval needed)
    cleaned = "".join(c for c in query.strip().lower() if c.isalnum() or c.isspace()).strip()
    conversational_phrases = {
        "hi", "hii", "hello", "hey", "good morning", "good afternoon", "good evening",
        "how are you", "thanks", "thank you", "okay", "ok", "bye",
    }
    is_conversational = cleaned in conversational_phrases

    retrieved_chunks: List[Dict[str, Any]] = []
    if not is_conversational:
        retrieved_chunks = hybrid_search(tender_id, query, k=5, alpha=0.5)

    # 2. Build user prompt content
    user_content = ""
    if retrieved_chunks:
        user_content += "CONTEXT FROM TENDER DOCUMENTS:\n\n"
        for chunk in retrieved_chunks:
            meta = chunk["metadata"]
            user_content += (
                f"--- Document ID: {meta.get('document_id', 'Unknown')} "
                f"| Page: {meta.get('page_number', 'Unknown')} ---\n"
                f"{meta.get('text', '')}\n\n"
            )

    user_content += f"USER MESSAGE:\n{query}"

    # 3. Assemble message list (system + optional history + user)
    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if chat_history:
        for m in chat_history[-4:]:  # keep last 4 turns to control token usage
            messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": user_content})

    print("=" * 48)
    print(f"CHAT  tender_id={tender_id}  chunks={len(retrieved_chunks)}")
    print(f"QUERY: {query}")

    try:
        answer = _call_groq(messages)

        print(f"ANSWER: {answer[:120]}...")
        print("=" * 48)

        if retrieved_chunks and "is not available" not in answer.lower():
            final_answer = (
                "📄 SOURCE NOTICE\n\n"
                "This information is based on the uploaded tender documents.\n\n"
                + answer
            )
            return {"answer": final_answer, "sources": retrieved_chunks}

        return {"answer": answer, "sources": []}

    except ValueError as ve:
        print(f"Config Error: {ve}")
        return {
            "answer": "⚠️ The AI service is not configured. Please add your GROQ_API_KEY to the .env file.",
            "sources": [],
        }
    except Exception as e:
        print(f"Groq Error: {e}")
        return {
            "answer": "The AI service is currently unavailable. Please try again shortly.",
            "sources": [],
        }


def extract_structured_field(
    tender_id: int,
    field_name: str,
    search_queries: List[str],
    expected_type: str = "string",
) -> Dict[str, Any]:
    """Retrieve context for a field and ask Groq to return a JSON structured extraction."""

    # 1. Retrieve context across multiple search queries
    all_retrieved: List[Dict[str, Any]] = []
    seen_chunks: set = set()
    for q in search_queries:
        for c in hybrid_search(tender_id, q, k=4, alpha=0.5):
            cid = c["metadata"].get("chunk_id")
            if cid not in seen_chunks:
                seen_chunks.add(cid)
                all_retrieved.append(c)

    all_retrieved = sorted(all_retrieved, key=lambda x: x["score"], reverse=True)[:6]

    if not all_retrieved:
        return {
            "value": "Not specified in uploaded documents.",
            "confidence": 0.0,
            "page": "Unknown",
            "evidence": "",
            "document": "Unknown",
        }

    # 2. Build prompt
    context_text = "CONTEXT FROM TENDER DOCUMENTS:\n\n"
    for chunk in all_retrieved:
        meta = chunk["metadata"]
        context_text += (
            f"--- Document ID: {meta.get('document_id', 'Unknown')} "
            f"| Page: {meta.get('page_number', 'Unknown')} ---\n"
            f"{meta.get('text', '')}\n\n"
        )

    extraction_prompt = f"""{context_text}
TASK:
Extract the value for the field '{field_name}' strictly from the context above.
If the information is absent, set value to exactly "Not specified in uploaded documents."

Respond with ONLY a valid JSON object (no markdown):
{{
  "value": "extracted information",
  "confidence": 0.95,
  "page": "page number where found or Unknown",
  "evidence": "exact sentence from the text proving this",
  "document": "document ID from the context block"
}}"""

    messages = [
        {"role": "system", "content": "You are a precise document extraction AI. Always respond with valid JSON only."},
        {"role": "user", "content": extraction_prompt},
    ]

    try:
        raw = _call_groq(messages, temperature=0.0, json_mode=True)
        data = json.loads(raw)

        # Verify evidence isn't hallucinated
        evidence = data.get("evidence", "")
        if evidence and evidence != "Not specified in uploaded documents.":
            found = any(
                evidence.lower() in c["metadata"].get("text", "").lower()
                for c in all_retrieved
            )
            if not found:
                data["confidence"] = 0.0

        return {
            "value": str(data.get("value", "Not specified in uploaded documents.")),
            "confidence": float(data.get("confidence", 0.0)),
            "page": str(data.get("page", "Unknown")),
            "evidence": str(data.get("evidence", "")),
            "document": str(data.get("document", "Unknown")),
        }

    except Exception as e:
        print(f"Groq Extraction Error: {e}")
        return {
            "value": "Error during extraction",
            "confidence": 0.0,
            "page": "Unknown",
            "evidence": str(e),
            "document": "Unknown",
        }

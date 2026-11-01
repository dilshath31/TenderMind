import uuid
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.user import User  # Ensure User is in SQLAlchemy registry before Tender
from app.models.tender import TenderDocument, DocumentPage, DocumentChunk, Tender
from app.services.pdf.extractor import extract_pdf_pages, chunk_text

@celery_app.task(bind=True, name="process_document")
def process_document(self, document_id: int):
    db: Session = SessionLocal()
    document = None
    try:
        document = db.query(TenderDocument).filter(TenderDocument.id == document_id).first()
        if not document:
            return "Document not found"
            
        document.status = "Processing"
        document.processing_stage = "EXTRACTING"
        document.processing_progress = 10
        document.processing_message = "Extracting PDF text"
        db.commit()
        
        # Extract text using PyMuPDF
        pages = extract_pdf_pages(document.storage_path)
        
        from app.services.retrieval.faiss_index import FAISSIndex
        from app.services.retrieval.bm25_index import BM25Index
        from app.services.embeddings.model import get_embeddings_batch

        chunk_index = 0
        all_chunks_text = []
        all_metadata = []
        
        document.processing_stage = "CHUNKING"
        document.processing_progress = 30
        document.processing_message = f"Chunking {len(pages)} pages"
        db.commit()
        
        for page_data in pages:
            # Save Page
            doc_page = DocumentPage(
                document_id=document.id,
                page_number=page_data["page_number"],
                text_content=page_data["text"]
            )
            db.add(doc_page)
            
            # Create Chunks
            chunks = chunk_text(page_data["text"])
            for text_chunk in chunks:
                if not text_chunk.strip() or len(text_chunk.strip()) < 15:
                    continue
                    
                chunk_id = str(uuid.uuid4())
                doc_chunk = DocumentChunk(
                    document_id=document.id,
                    page_number=page_data["page_number"],
                    chunk_index=chunk_index,
                    chunk_id=chunk_id,
                    text_content=text_chunk
                )
                db.add(doc_chunk)
                
                # Prepare for indexing
                all_chunks_text.append(text_chunk)
                all_metadata.append({
                    "chunk_id": chunk_id,
                    "document_id": document.id,
                    "page_number": page_data["page_number"],
                    "text": text_chunk
                })
                
                chunk_index += 1
                
        import hashlib
        import os
        import pickle
        
        CACHE_DIR = "/data/embeddings_cache" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/embeddings_cache"
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_path = os.path.join(CACHE_DIR, "global_embedding_cache.pkl")
        
        global_cache = {}
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "rb") as f:
                    global_cache = pickle.load(f)
            except:
                global_cache = {}
                
        all_embeddings = []
        batch_size = 32
        total_chunks = len(all_chunks_text)
        
        document.processing_stage = "EMBEDDING"
        document.processing_message = f"Generating embeddings for {total_chunks} chunks"
        document.processing_progress = 40
        db.commit()
        
        new_embeddings_computed = False
        
        for i in range(0, total_chunks, batch_size):
            batch_texts = all_chunks_text[i:i+batch_size]
            batch_embeddings = []
            
            # Find which texts need computation
            texts_to_compute = []
            indices_to_compute = []
            
            for idx, text in enumerate(batch_texts):
                text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
                if text_hash in global_cache:
                    batch_embeddings.append(global_cache[text_hash])
                else:
                    batch_embeddings.append(None) # Placeholder
                    texts_to_compute.append(text)
                    indices_to_compute.append(idx)
                    
            if texts_to_compute:
                computed = get_embeddings_batch(texts_to_compute, batch_size=batch_size)
                new_embeddings_computed = True
                
                for idx, emb, text in zip(indices_to_compute, computed, texts_to_compute):
                    batch_embeddings[idx] = emb
                    text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
                    global_cache[text_hash] = emb
                    
            all_embeddings.extend(batch_embeddings)
            
            # Update progress
            progress = 40 + int(40 * (i + len(batch_texts)) / total_chunks)
            document.processing_progress = progress
            document.processing_message = f"Embedded {i + len(batch_texts)} / {total_chunks} chunks"
            db.commit()
            
        if new_embeddings_computed:
            try:
                with open(cache_path, "wb") as f:
                    pickle.dump(global_cache, f)
            except Exception as e:
                print(f"Failed to save embedding cache: {e}")
                
        # Create and build indices
        if all_chunks_text:
            document.processing_stage = "INDEXING"
            document.processing_progress = 85
            document.processing_message = "Updating FAISS and BM25 indices"
            db.commit()
            
            faiss_idx = FAISSIndex(document.tender_id)
            faiss_idx.add_chunks(all_embeddings, all_metadata)
            
            bm25_idx = BM25Index(document.tender_id)
            bm25_idx.add_chunks(all_chunks_text, all_metadata)
            
        document.status = "Ready"
        document.processing_stage = "READY"
        document.processing_progress = 100
        document.processing_message = "Processing complete"
        
        # Also update parent tender
        tender = document.tender
        if tender:
            tender.status = "Ready"
            
        db.commit()
        return "Success"
        
    except Exception as e:
        db.rollback()
        if document:
            document.status = "Processing Failed"
            document.processing_stage = "FAILED"
            document.failed_stage = document.processing_stage
            document.processing_message = str(e)
            if document.tender:
                document.tender.status = "Processing Failed"
            db.commit()
        return str(e)
    finally:
        db.close()

from app.models.tender import TenderSummary, TenderSummaryField, TenderDocument
from app.services.rag.generation import extract_structured_field
import json

@celery_app.task(bind=True, name="generate_tender_summary")
def generate_tender_summary_task(self, tender_id: int, summary_id: int):
    db: Session = SessionLocal()
    summary = None
    try:
        summary = db.query(TenderSummary).filter(TenderSummary.id == summary_id).first()
        if not summary:
            return "Summary not found"
            
        summary.status = "Generating"
        db.commit()
        
        # Verify readiness
        documents = db.query(TenderDocument).filter(TenderDocument.tender_id == tender_id).all()
        doc_map = {doc.id: doc.filename for doc in documents}
        
        if not documents or not all(d.status == "Ready" for d in documents):
            summary.status = "Failed"
            db.commit()
            return "Documents not ready for extraction"
        
        # Define field-specific queries broadly to gather context fast
        broad_queries = [
            "tender title name of work subject project name NIT no reference number issued by procuring entity department category location site",
            "estimated value estimated cost contract value EMD earnest money bid security tender fee",
            "contract duration project period time publication date closing date submission deadline",
            "bidder eligibility company registration minimum turnover experience requirements similar work",
            "scope of work technical specifications deliverables standard required documents mandatory attachments certificates declarations"
        ]
        
        from app.services.retrieval.hybrid import hybrid_search
        import httpx
        from app.core.config import settings
        import time
        import json
        
        start_time = time.time()
        
        # 1. Retrieve Context
        all_retrieved = []
        seen_chunks = set()
        
        for q in broad_queries:
            chunks = hybrid_search(tender_id, q, k=5, alpha=0.5)
            for c in chunks:
                cid = c['metadata']['chunk_id']
                if cid not in seen_chunks:
                    seen_chunks.add(cid)
                    all_retrieved.append(c)
                    
        # Limit to top 25 chunks
        all_retrieved = sorted(all_retrieved, key=lambda x: x['score'], reverse=True)[:25]
        retrieval_time = time.time() - start_time
        
        # 2. Gather DB Meta
        tender = db.query(Tender).filter(Tender.id == tender_id).first()
        tender_meta = f"Title: {tender.title}\nOrg: {tender.issuing_organization}\nCategory: {tender.category}\nLocation: {tender.location}"
        
        # 3. Build Prompt
        prompt = f"""
SYSTEM: You are TenderMind AI. Generate a concise but detailed executive summary using ONLY the supplied tender information.
Return structured JSON with exactly these keys:
"Tender Title", "Tender Reference Number", "Issuing Organization", "Tender Category", "Location", "Estimated Tender Value", "EMD / Bid Security", "Tender Fee", "Contract Duration", "Publication Date", "Bid Submission Deadline", "Eligibility Summary", "Key Technical Requirements", "Important Submission Documents"

For each key, provide a nested object in exact JSON format:
{{
  "value": "...",
  "page": "...",
  "document": "...",
  "evidence": "..."
}}
If a field is not available, set value to "Not specified in uploaded documents."

TENDER DATABASE INFO:
{tender_meta}

CONTEXT FROM DOCUMENTS:
"""
        for chunk in all_retrieved:
            meta = chunk['metadata']
            prompt += f"--- Document ID: {meta.get('document_id', 'Unknown')} | Page: {meta.get('page_number', 'Unknown')} ---\n{meta.get('text', '')}\n\n"
            
        # 4. Call Groq API
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            raise ValueError("GROQ_API_KEY is not configured in .env")

        groq_headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        groq_payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are TenderMind AI. Generate structured JSON summaries of tender documents. Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
        }

        groq_start = time.time()
        last_exc = None
        for attempt in range(3):
            try:
                response = httpx.post(settings.GROQ_API_URL, headers=groq_headers, json=groq_payload, timeout=120.0)
                if response.status_code == 429:
                    wait = int(response.headers.get("retry-after", "5"))
                    time.sleep(min(wait, 15))
                    last_exc = Exception("429 rate limit")
                    continue
                response.raise_for_status()
                break
            except Exception as e:
                last_exc = e
                if attempt < 2:
                    time.sleep(3)
        else:
            raise last_exc
        raw_answer = response.json()["choices"][0]["message"]["content"].strip()
        groq_time = time.time() - groq_start

        data = json.loads(raw_answer)
        
        # Ensure all required fields exist
        expected_fields = [
            "Tender Title", "Tender Reference Number", "Issuing Organization", "Tender Category", "Location", 
            "Estimated Tender Value", "EMD / Bid Security", "Tender Fee", "Contract Duration", 
            "Publication Date", "Bid Submission Deadline", "Eligibility Summary", 
            "Key Technical Requirements", "Important Submission Documents"
        ]
        
        db_start = time.time()
        for field_name in expected_fields:
            result = data.get(field_name, {})
            if not isinstance(result, dict):
                result = {"value": str(result), "page": "Unknown", "document": "Unknown", "evidence": ""}
                
            doc_id_str = str(result.get("document", "Unknown"))
            doc_name = "Unknown"
            if doc_id_str.isdigit() and int(doc_id_str) in doc_map:
                doc_name = doc_map[int(doc_id_str)]
                
            summary_field = TenderSummaryField(
                summary_id=summary.id,
                field_name=field_name,
                extracted_value=str(result.get("value", "Not specified in uploaded documents.")),
                source_document=doc_name,
                page_number=str(result.get("page", "Unknown")),
                evidence=str(result.get("evidence", ""))
            )
            db.add(summary_field)
            
        summary.status = "Completed"
        db.commit()
        db_time = time.time() - db_start
        
        total_time = time.time() - start_time
        print(f"SUMMARY REQUEST | tender_id = {tender_id} | Retrieval = {retrieval_time:.2f}s | Groq = {groq_time:.2f}s | DB = {db_time:.2f}s | TOTAL = {total_time:.2f}s")
        return "Success"
        
    except Exception as e:
        db.rollback()
        if summary:
            summary.status = "Failed"
            db.commit()
        return str(e)
    finally:
        db.close()

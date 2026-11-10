# TenderMind

TenderMind is an AI-powered Tender Intelligence and Decision Support System. It uses **Groq's free cloud API** (Llama 3 · ultra-fast inference), Hybrid Retrieval (FAISS CPU + BM25), and a full-stack React + FastAPI platform to analyze tender documents in seconds.

## Features
- **Company Profile Management**: Maintain capabilities, documents, and financial history.
- **Tender Multi-Document RAG**: Upload multiple PDFs per tender (Main, Tech, BOQ, etc.). PyMuPDF separates and chunks pages automatically.
- **Hybrid Semantic Search**: `all-MiniLM-L6-v2` dense search combined with BM25 TF-IDF sparse search.
- **AI Chat with Source Notices**: Groq-powered Llama 3 answers questions citing exact source documents and page numbers.
- **Eligibility Matching**: Extracts requirements from the tender and compares them against your Company Profile.
- **Tender Compare**: Side-by-side comparison of multiple tenders.
- **Analysis Reports**: Export executive summaries and comparison tables.
- **Research Dashboard**: Built-in ML experiment baselines (Logistic Regression, Decision Trees, DistilBERT).

## Architecture & Technology Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Python, FastAPI, SQLAlchemy
- **Database**: PostgreSQL (Containerized)
- **Background Tasks**: Celery, Redis (Containerized)
- **Document Processing**: PyMuPDF (`fitz`)
- **Retrieval**: FAISS CPU, scikit-learn (TF-IDF/BM25)
- **AI**: Groq Cloud API (Llama 3 8B · Free tier)

## Installation & Startup

### 1. Get a free Groq API key
Sign up at [console.groq.com](https://console.groq.com) and copy your API key.

### 2. Create your `.env` file
Copy `.env.example` to `.env` and fill in your key:
```env
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=llama3-8b-8192
```

### 3. Start the Application
```bash
docker compose up --build
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- FastAPI Backend (port 8000)
- React Frontend (port 5173)
- Celery Worker (background)

### 4. Open the App
Navigate to [http://localhost:5173](http://localhost:4173).

## Privacy
Only anonymized queries are sent to the Groq API. Your raw tender PDFs and company profile stay on your server. Do not upload confidential documents if you require full on-premises processing.

## Testing
Integration tests are in `backend/tests/`. Run with `pytest`.

---
*TenderMind · AI Procurement Suite*

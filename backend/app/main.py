from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.core.config import settings
from app.api.routers import auth, users, company, tenders, chat, research, documents
from app.db.database import engine, Base
from app.models import user, company as company_model, tender as tender_model, chat as chat_model

# Create tables for now. Later we will use alembic.
Base.metadata.create_all(bind=engine)

# ── Add new columns that may not exist yet (safe migration) ──────────────────
def _add_column_if_missing(table: str, col: str, col_type: str):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            conn.commit()
    except Exception:
        pass

_add_column_if_missing("companies", "founded_year",       "INTEGER")
_add_column_if_missing("companies", "annual_turnover_cr", "FLOAT")
_add_column_if_missing("companies", "net_worth_cr",       "FLOAT")
_add_column_if_missing("companies", "solvency_amount_cr", "FLOAT")
_add_column_if_missing("companies", "num_employees",      "INTEGER")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:4173", "http://127.0.0.1:4173", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(company.router, prefix=f"{settings.API_V1_STR}/company", tags=["company"])
app.include_router(tenders.router, prefix=f"{settings.API_V1_STR}/tenders", tags=["tenders"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(research.router, prefix=f"{settings.API_V1_STR}/research", tags=["research"])

@app.get(f"{settings.API_V1_STR}/health")
def health_check(db: Session = Depends(get_db)):
    health_status = {
        "status": "ok",
        "backend": "ok",
        "database": "fail",
        "redis": "fail",
        "celery": "fail",
        "groq_ai": "fail"
    }
    
    # Check DB
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "ok"
    except Exception:
        pass
        
    # Check Redis
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        if r.ping():
            health_status["redis"] = "ok"
    except Exception:
        pass
        
    # Check Celery
    try:
        from app.core.celery_app import celery_app
        # This checks if the worker is reachable, or we can just check if broker is connected
        i = celery_app.control.inspect()
        if i.ping() is not None:
            health_status["celery"] = "ok"
    except Exception:
        pass
        
    # Check Groq API key is configured
    try:
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here":
            health_status["groq_ai"] = "ok"
    except Exception:
        pass
        
    if "fail" in health_status.values():
        health_status["status"] = "degraded"
    
    return health_status

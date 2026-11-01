from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS processing_stage VARCHAR;'))
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS processing_progress INTEGER;'))
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS processing_message VARCHAR;'))
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS failed_stage VARCHAR;'))
    conn.commit()
    print("Database processing columns added successfully.")

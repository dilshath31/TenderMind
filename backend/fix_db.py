from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS file_hash VARCHAR;'))
    conn.execute(text('ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS pdf_type VARCHAR;'))
    conn.commit()
    print("Database columns added successfully.")

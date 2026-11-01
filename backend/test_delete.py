import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.db.database import SessionLocal
from app.models.tender import Tender, TenderSummary
from app.models.chat import ChatSession

db = SessionLocal()
try:
    # Just grab any tender ID to see what happens when we delete it
    # We can create a dummy tender to test
    tender = Tender(title="Test Delete", user_id=1)
    db.add(tender)
    db.commit()
    db.refresh(tender)
    
    # Add a TenderSummary to it
    summary = TenderSummary(tender_id=tender.id, status="Completed")
    db.add(summary)
    db.commit()

    print(f"Created tender {tender.id} with summary.")
    
    # Now try to delete just like the API does
    # First chat sessions
    chat_sessions = db.query(ChatSession).filter(ChatSession.tender_id == tender.id).all()
    for cs in chat_sessions:
        db.delete(cs)
        
    # Then tender
    db.delete(tender)
    db.commit()
    print("Delete successful!")
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()
finally:
    db.close()

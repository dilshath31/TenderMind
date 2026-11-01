from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api import deps
from app.models.user import User
from app.models.tender import Tender
from app.models.chat import ChatSession, ChatMessage, ChatSource
from app.schemas.chat import ChatSession as ChatSessionSchema, ChatSessionCreate, ChatMessage as ChatMessageSchema, ChatRequest
from app.services.rag.generation import generate_rag_response

router = APIRouter()

@router.post("/sessions", response_model=ChatSessionSchema)
def create_session(
    session_in: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    tender = db.query(Tender).filter(Tender.id == session_in.tender_id, Tender.user_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    session = ChatSession(
        user_id=current_user.id,
        tender_id=session_in.tender_id,
        title=session_in.title
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions", response_model=List[ChatSessionSchema])
def list_sessions(
    tender_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    if tender_id:
        query = query.filter(ChatSession.tender_id == tender_id)
    return query.all()

@router.post("/sessions/{session_id}/message", response_model=ChatMessageSchema)
def send_message(
    session_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()
    
    # Check document status
    from app.models.tender import TenderDocument
    documents = db.query(TenderDocument).filter(
        TenderDocument.tender_id == session.tender_id
    ).all()
    
    if len(documents) == 0:
        answer = "No documents have been uploaded for this tender yet."
        rag_result = {"answer": answer, "sources": []}
    elif all(doc.status == 'Processing Failed' or doc.processing_stage == 'FAILED' for doc in documents):
        answer = "The tender document was uploaded, but processing failed. Please retry processing."
        rag_result = {"answer": answer, "sources": []}
    elif all(doc.status != 'Ready' for doc in documents):
        answer = "The tender document is still being processed. Please try again shortly."
        rag_result = {"answer": answer, "sources": []}
    else:
        # Get chat history for conversational context (last 4 messages to prevent context overflow)
        history_msgs = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id
        ).order_by(ChatMessage.created_at.desc()).limit(4).all()
        
        chat_history = []
        for m in reversed(history_msgs):
            chat_history.append({"role": m.role, "content": m.content})
            
        # Generate response using ONLY chunks for this specific tender_id
        rag_result = generate_rag_response(session.tender_id, request.message, chat_history)
    
    # Save assistant message
    ai_msg = ChatMessage(session_id=session.id, role="assistant", content=rag_result["answer"])
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)
    
    # Save sources
    for src in rag_result["sources"]:
        meta = src["metadata"]
        db_source = ChatSource(
            message_id=ai_msg.id,
            document_id=meta.get("document_id"),
            page_number=meta.get("page_number"),
            chunk_text=meta.get("text")
        )
        db.add(db_source)
    db.commit()
    
    db.refresh(ai_msg)
    return ai_msg

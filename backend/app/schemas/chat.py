from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatSourceBase(BaseModel):
    document_id: Optional[int] = None
    page_number: Optional[int] = None
    chunk_text: Optional[str] = None

class ChatSource(ChatSourceBase):
    id: int
    message_id: int
    
    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime
    sources: List[ChatSource] = []
    
    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    tender_id: int
    title: Optional[str] = "New Chat"

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[ChatMessage] = []
    
    class Config:
        from_attributes = True
        
class ChatRequest(BaseModel):
    message: str

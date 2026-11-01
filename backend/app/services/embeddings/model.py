from sentence_transformers import SentenceTransformer
from typing import List
from app.core.config import settings

# Load model lazily to avoid blocking server startup if HuggingFace is slow
embedder = None

def get_embedding(text: str) -> list[float]:
    """Generate a dense embedding for the given text."""
    global embedder
    if embedder is None:
        import torch
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Loading SentenceTransformer on {device}...")
        embedder = SentenceTransformer('all-MiniLM-L6-v2', device=device)
    
    embedding = embedder.encode(text, convert_to_numpy=True)
    return embedding.tolist()

def get_embeddings_batch(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """Generate dense embeddings for a batch of texts."""
    global embedder
    if embedder is None:
        import torch
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Loading SentenceTransformer on {device}...")
        embedder = SentenceTransformer('all-MiniLM-L6-v2', device=device)
    
    
    if not texts:
        return []
        
    import torch
    
    # Use inference mode if torch is available for optimized evaluation
    if hasattr(torch, 'inference_mode'):
        with torch.inference_mode():
            embeddings = embedder.encode(texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False)
    else:
        with torch.no_grad():
            embeddings = embedder.encode(texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False)
            
    return embeddings.tolist()

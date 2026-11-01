from typing import List, Dict, Any
from app.services.retrieval.faiss_index import FAISSIndex
from app.services.retrieval.bm25_index import BM25Index
from app.services.embeddings.model import get_embedding

def hybrid_search(
    tender_id: int, 
    query: str, 
    k: int = 5, 
    alpha: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Performs hybrid search combining dense (FAISS) and sparse (BM25/TF-IDF) retrieval.
    alpha controls the weight: 1.0 is pure FAISS, 0.0 is pure BM25.
    """
    faiss_idx = FAISSIndex(tender_id)
    bm25_idx = BM25Index(tender_id)
    
    # Get dense results
    query_embedding = get_embedding(query)
    dense_results = faiss_idx.search(query_embedding, k=k*2)
    
    # Get sparse results
    sparse_results = bm25_idx.search(query, k=k*2)
    
    # Normalize dense scores (FAISS L2 distance -> similarity)
    # L2 distance is smaller for better matches. Let's invert it.
    max_dist = max([d for _, d in dense_results]) if dense_results else 1.0
    if max_dist == 0: max_dist = 1.0
    
    normalized_dense = {}
    for meta, dist in dense_results:
        sim = 1.0 - (dist / max_dist)
        normalized_dense[meta['chunk_id']] = (meta, sim)
        
    # Normalize sparse scores
    max_sim = max([s for _, s in sparse_results]) if sparse_results else 1.0
    if max_sim == 0: max_sim = 1.0
    
    normalized_sparse = {}
    for meta, sim in sparse_results:
        normalized_sparse[meta['chunk_id']] = (meta, sim / max_sim)
        
    # Combine scores
    combined_scores = {}
    all_chunk_ids = set(normalized_dense.keys()).union(set(normalized_sparse.keys()))
    
    for cid in all_chunk_ids:
        meta = None
        dense_score = 0.0
        sparse_score = 0.0
        
        if cid in normalized_dense:
            meta = normalized_dense[cid][0]
            dense_score = normalized_dense[cid][1]
            
        if cid in normalized_sparse:
            meta = normalized_sparse[cid][0]
            sparse_score = normalized_sparse[cid][1]
            
        final_score = (alpha * dense_score) + ((1 - alpha) * sparse_score)
        combined_scores[cid] = (meta, final_score)
        
    # Sort by final score
    sorted_results = sorted(combined_scores.values(), key=lambda x: x[1], reverse=True)
    
    return [{"metadata": meta, "score": score} for meta, score in sorted_results[:k]]

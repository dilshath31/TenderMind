import os
import pickle
from typing import List, Tuple, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

INDEX_DIR = "/data/bm25" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/bm25"

# Note: scikit-learn's TfidfVectorizer is used here as a fast baseline alternative
# to a full BM25 implementation for demonstration. True BM25 can be implemented 
# with custom term frequencies, but TF-IDF is available out-of-the-box and CPU friendly.
# For exact BM25, a package like rank_bm25 could be used, but since scikit-learn is 
# in the requirements, we implement a TF-IDF retrieval that functions similarly.

class BM25Index:
    def __init__(self, tender_id: int):
        self.tender_id = tender_id
        self.index_path = os.path.join(INDEX_DIR, f"tender_{tender_id}_vectorizer.pkl")
        self.vectors_path = os.path.join(INDEX_DIR, f"tender_{tender_id}_vectors.pkl")
        self.metadata_path = os.path.join(INDEX_DIR, f"tender_{tender_id}_meta.pkl")
        
        os.makedirs(INDEX_DIR, exist_ok=True)
        
        if os.path.exists(self.index_path) and os.path.exists(self.vectors_path) and os.path.exists(self.metadata_path):
            with open(self.index_path, "rb") as f:
                self.vectorizer = pickle.load(f)
            with open(self.vectors_path, "rb") as f:
                self.vectors = pickle.load(f)
            with open(self.metadata_path, "rb") as f:
                self.metadata = pickle.load(f)
            
            # Reconstruct corpus from metadata since TF-IDF needs the raw text for fitting,
            # or ideally we just use the loaded vectorizer. But since we are fitting again:
            self.corpus = [m.get("text", "") for m in self.metadata]
        else:
            self.vectorizer = TfidfVectorizer(stop_words='english')
            self.vectors = None
            self.metadata = []
            self.corpus = []

    def add_chunks(self, texts: List[str], chunks_metadata: List[dict]):
        if not texts:
            return
            
        if os.path.exists(self.vectors_path):
            # For simplicity, we just rebuild if it exists. 
            # In a real scenario, incremental BM25 is complex.
            self.corpus.extend(texts)
            self.metadata.extend(chunks_metadata)
        else:
            self.corpus = texts
            self.metadata = chunks_metadata
            
        self.vectors = self.vectorizer.fit_transform(self.corpus)
        
        with open(self.index_path, "wb") as f:
            pickle.dump(self.vectorizer, f)
        with open(self.vectors_path, "wb") as f:
            pickle.dump(self.vectors, f)
        with open(self.metadata_path, "wb") as f:
            pickle.dump(self.metadata, f)

    def search(self, query: str, k: int = 5) -> List[Tuple[dict, float]]:
        if self.vectors is None or not self.metadata:
            return []
            
        query_vec = self.vectorizer.transform([query])
        
        # Calculate cosine similarity (dot product of normalized vectors)
        similarities = (self.vectors * query_vec.T).toarray().flatten()
        
        # Get top k indices
        top_indices = similarities.argsort()[-k:][::-1]
        
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0:
                results.append((self.metadata[idx], score))
                
        return results

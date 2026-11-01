import faiss
import numpy as np
import os
import pickle
from typing import List, Tuple

INDEX_DIR = "/data/faiss" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/faiss"

class FAISSIndex:
    def __init__(self, tender_id: int, dimension: int = 384):
        self.tender_id = tender_id
        self.dimension = dimension
        self.index_path = os.path.join(INDEX_DIR, f"tender_{tender_id}.faiss")
        self.metadata_path = os.path.join(INDEX_DIR, f"tender_{tender_id}_meta.pkl")
        
        os.makedirs(INDEX_DIR, exist_ok=True)
        
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, "rb") as f:
                self.metadata = pickle.load(f)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
            self.metadata = []

    def add_chunks(self, embeddings: List[List[float]], chunks_metadata: List[dict]):
        if not embeddings:
            return
            
        vectors = np.array(embeddings).astype('float32')
        self.index.add(vectors)
        self.metadata.extend(chunks_metadata)
        
        faiss.write_index(self.index, self.index_path)
        with open(self.metadata_path, "wb") as f:
            pickle.dump(self.metadata, f)

    def search(self, query_embedding: List[float], k: int = 5) -> List[Tuple[dict, float]]:
        if self.index.ntotal == 0:
            return []
            
        vector = np.array([query_embedding]).astype('float32')
        distances, indices = self.index.search(vector, k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                results.append((self.metadata[idx], float(distances[0][i])))
                
        return results

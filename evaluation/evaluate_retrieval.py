#!/usr/bin/env python3
"""
Retrieval Evaluation Pipeline for TenderMind
============================================
Final-Year Project & IEEE Research Paper Evaluation

This script evaluates the three core retrieval methods implemented in TenderMind:
  1. BM25 (Sparse Lexical TF-IDF Vector Space Retrieval)
  2. Dense FAISS (Dense Vector Similarity via all-MiniLM-L6-v2)
  3. Hybrid Retrieval (Score-normalized weighted combination, alpha=0.5)

Evaluated Metrics:
  1. Precision@5: Proportion of top-5 retrieved chunks that are verified relevant.
  2. Recall@5: Proportion of all verified relevant chunks retrieved in top-5.
  3. Mean Reciprocal Rank (MRR): 1 / rank of first relevant retrieved chunk.
  4. Hit Rate@5: Binary indicator (1/0) if at least one relevant chunk is in top-5.
  5. nDCG@5: Normalized Discounted Cumulative Gain at rank 5.

All metrics are calculated using verified ground-truth chunk IDs from actual tender PDFs.
Results are saved to:
  - retrieval_results.csv (detailed per-query performance)
  - summary_metrics.csv (aggregated metrics across all queries)
"""

import os
import sys
import json
import math
import csv
import argparse
from typing import List, Dict, Any, Tuple

# Automatically detect workspace / Docker paths and add backend to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if os.path.exists("/app"):
    if "/app" not in sys.path:
        sys.path.insert(0, "/app")
elif os.path.exists(BACKEND_DIR):
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)

try:
    from app.services.retrieval.bm25_index import BM25Index
    from app.services.retrieval.faiss_index import FAISSIndex
    from app.services.retrieval.hybrid import hybrid_search
    from app.services.embeddings.model import get_embedding
except ImportError as e:
    print(f"Error importing TenderMind retrieval modules: {e}")
    print(f"Current sys.path: {sys.path}")
    sys.exit(1)


def compute_ndcg_at_k(retrieved_ids: List[str], relevant_ids: set, k: int = 5) -> Tuple[float, float, float]:
    """
    Computes DCG@k, IDCG@k, and nDCG@k using standard binary relevance log2 formulation.
    rank i (1-indexed) discount: log2(i + 1)
    """
    dcg = 0.0
    for i, cid in enumerate(retrieved_ids[:k]):
        if cid in relevant_ids:
            rank = i + 1
            dcg += 1.0 / math.log2(rank + 1)

    num_ideal = min(len(relevant_ids), k)
    idcg = 0.0
    for r in range(1, num_ideal + 1):
        idcg += 1.0 / math.log2(r + 1)

    ndcg = (dcg / idcg) if idcg > 0 else 0.0
    return dcg, idcg, ndcg


def evaluate_query(
    tender_id: int,
    query: str,
    relevant_chunk_ids: List[str],
    k: int = 5,
    alpha: float = 0.5
) -> Dict[str, Dict[str, Any]]:
    """
    Executes BM25, FAISS, and Hybrid retrieval for a single query and calculates all 5 metrics.
    """
    relevant_set = set(relevant_chunk_ids)
    num_relevant = len(relevant_set)

    # 1. BM25 Retrieval
    bm25_idx = BM25Index(tender_id)
    bm25_raw = bm25_idx.search(query, k=k)
    bm25_retrieved = [item[0]["chunk_id"] for item in bm25_raw]

    # 2. Dense FAISS Retrieval
    faiss_idx = FAISSIndex(tender_id)
    query_emb = get_embedding(query)
    faiss_raw = faiss_idx.search(query_emb, k=k)
    faiss_retrieved = [item[0]["chunk_id"] for item in faiss_raw]

    # 3. Hybrid Retrieval
    hybrid_raw = hybrid_search(tender_id, query, k=k, alpha=alpha)
    hybrid_retrieved = [item["metadata"]["chunk_id"] for item in hybrid_raw]

    methods = {
        "BM25": bm25_retrieved,
        "Dense FAISS": faiss_retrieved,
        "Hybrid Retrieval": hybrid_retrieved
    }

    eval_results = {}
    for method_name, retrieved in methods.items():
        retrieved_k = retrieved[:k]
        hits = [cid for cid in retrieved_k if cid in relevant_set]
        num_hits = len(hits)

        # Precision@k
        precision = num_hits / float(k)

        # Recall@k
        recall = (num_hits / float(num_relevant)) if num_relevant > 0 else 0.0

        # Reciprocal Rank (RR)
        first_rank = 0
        rr = 0.0
        for i, cid in enumerate(retrieved_k):
            if cid in relevant_set:
                first_rank = i + 1
                rr = 1.0 / first_rank
                break

        # Hit Rate@k
        hit = 1.0 if num_hits > 0 else 0.0

        # nDCG@k
        dcg, idcg, ndcg = compute_ndcg_at_k(retrieved_k, relevant_set, k=k)

        eval_results[method_name] = {
            "retrieved_chunk_ids": retrieved_k,
            "relevant_chunk_ids": list(relevant_chunk_ids),
            "num_relevant": num_relevant,
            "num_retrieved_relevant": num_hits,
            "first_relevant_rank": first_rank,
            "precision@k": precision,
            "recall@k": recall,
            "reciprocal_rank": rr,
            "hit@k": hit,
            "dcg@k": dcg,
            "idcg@k": idcg,
            "ndcg@k": ndcg
        }

    return eval_results


def run_evaluation(
    queries_path: str = None,
    output_results_path: str = None,
    output_summary_path: str = None,
    k: int = 5,
    alpha: float = 0.5
) -> Dict[str, Dict[str, float]]:
    """
    Main evaluation runner: processes dataset, computes metrics, and outputs CSV reports.
    """
    if queries_path is None:
        queries_path = os.path.join(SCRIPT_DIR, "test_queries.json")
    if output_results_path is None:
        output_results_path = os.path.join(SCRIPT_DIR, "retrieval_results.csv")
    if output_summary_path is None:
        output_summary_path = os.path.join(SCRIPT_DIR, "summary_metrics.csv")

    if not os.path.exists(queries_path):
        raise FileNotFoundError(f"Test queries dataset not found at: {queries_path}")

    with open(queries_path, "r", encoding="utf-8") as f:
        test_queries = json.load(f)

    num_queries = len(test_queries)
    print(f"\n================================================================================")
    print(f" TenderMind Genuine Retrieval Evaluation Pipeline")
    print(f" Total Evaluated Test Queries: {num_queries}")
    print(f" Cutoff Rank (k): {k} | Hybrid Alpha: {alpha}")
    print(f" Test Queries File: {queries_path}")
    print(f"================================================================================\n")

    detailed_rows = []
    method_metrics = {
        "BM25": {"precision": [], "recall": [], "rr": [], "hit": [], "ndcg": []},
        "Dense FAISS": {"precision": [], "recall": [], "rr": [], "hit": [], "ndcg": []},
        "Hybrid Retrieval": {"precision": [], "recall": [], "rr": [], "hit": [], "ndcg": []}
    }

    for idx, tq in enumerate(test_queries, start=1):
        qid = tq.get("query_id", f"Q{idx:02d}")
        tender_id = tq["tender_id"]
        tender_title = tq.get("tender_title", "")
        category = tq.get("category", "")
        query = tq["query"]
        relevant_ids = tq["relevant_chunk_ids"]

        query_eval = evaluate_query(tender_id, query, relevant_ids, k=k, alpha=alpha)

        print(f"[{idx}/{num_queries}] {qid} (Tender {tender_id}) - '{query[:50]}...'")
        for method, res in query_eval.items():
            method_metrics[method]["precision"].append(res["precision@k"])
            method_metrics[method]["recall"].append(res["recall@k"])
            method_metrics[method]["rr"].append(res["reciprocal_rank"])
            method_metrics[method]["hit"].append(res["hit@k"])
            method_metrics[method]["ndcg"].append(res["ndcg@k"])

            detailed_rows.append({
                "query_id": qid,
                "tender_id": tender_id,
                "tender_title": tender_title,
                "category": category,
                "query": query,
                "method": method,
                "k": k,
                "retrieved_chunk_ids": ";".join(res["retrieved_chunk_ids"]),
                "relevant_chunk_ids": ";".join(res["relevant_chunk_ids"]),
                "num_relevant": res["num_relevant"],
                "num_retrieved_relevant": res["num_retrieved_relevant"],
                "first_relevant_rank": res["first_relevant_rank"],
                "precision@5": round(res["precision@k"], 4),
                "recall@5": round(res["recall@k"], 4),
                "reciprocal_rank": round(res["reciprocal_rank"], 4),
                "hit@5": round(res["hit@k"], 4),
                "dcg@5": round(res["dcg@k"], 4),
                "idcg@5": round(res["idcg@k"], 4),
                "ndcg@5": round(res["ndcg@k"], 4)
            })

            print(f"    {method:<18}: P@{k}={res['precision@k']:.3f} | R@{k}={res['recall@k']:.3f} | RR={res['reciprocal_rank']:.3f} | Hit={res['hit@k']:.0f} | nDCG@{k}={res['ndcg@k']:.3f}")

    # Write detailed per-query results CSV
    fieldnames = [
        "query_id", "tender_id", "tender_title", "category", "query", "method", "k",
        "retrieved_chunk_ids", "relevant_chunk_ids", "num_relevant", "num_retrieved_relevant",
        "first_relevant_rank", "precision@5", "recall@5", "reciprocal_rank", "hit@5",
        "dcg@5", "idcg@5", "ndcg@5"
    ]
    with open(output_results_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(detailed_rows)
    print(f"\n[OK] Detailed per-query results saved to: {output_results_path}")

    # Compute summary aggregate metrics
    summary_results = {}
    summary_rows = []
    for method in ["BM25", "Dense FAISS", "Hybrid Retrieval"]:
        m_data = method_metrics[method]
        p_mean = sum(m_data["precision"]) / float(num_queries)
        r_mean = sum(m_data["recall"]) / float(num_queries)
        mrr = sum(m_data["rr"]) / float(num_queries)
        hit_rate = sum(m_data["hit"]) / float(num_queries)
        ndcg_mean = sum(m_data["ndcg"]) / float(num_queries)

        summary_results[method] = {
            "Precision@5": p_mean,
            "Recall@5": r_mean,
            "MRR": mrr,
            "Hit Rate@5": hit_rate,
            "nDCG@5": ndcg_mean
        }

        summary_rows.append({
            "method": method,
            "num_queries": num_queries,
            "precision@5": round(p_mean, 4),
            "recall@5": round(r_mean, 4),
            "mrr": round(mrr, 4),
            "hit_rate@5": round(hit_rate, 4),
            "ndcg@5": round(ndcg_mean, 4),
            "precision@5_pct": round(p_mean * 100, 2),
            "recall@5_pct": round(r_mean * 100, 2),
            "mrr_pct": round(mrr * 100, 2),
            "hit_rate@5_pct": round(hit_rate * 100, 2),
            "ndcg@5_pct": round(ndcg_mean * 100, 2)
        })

    # Write summary CSV
    summary_fieldnames = [
        "method", "num_queries", "precision@5", "recall@5", "mrr", "hit_rate@5", "ndcg@5",
        "precision@5_pct", "recall@5_pct", "mrr_pct", "hit_rate@5_pct", "ndcg@5_pct"
    ]
    with open(output_summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=summary_fieldnames)
        writer.writeheader()
        writer.writerows(summary_rows)
    print(f"[OK] Summary metrics saved to: {output_summary_path}")

    # Print publication-quality ASCII comparison table
    print(f"\n================================================================================")
    print(f" Summary Comparative Performance Results (N = {num_queries} queries)")
    print(f"================================================================================")
    print(f"{'Method':<20} | {'Precision@5':<12} | {'Recall@5':<12} | {'MRR':<10} | {'Hit Rate@5':<12} | {'nDCG@5':<10}")
    print(f"{'-'*20}-+-{'-'*12}-+-{'-'*12}-+-{'-'*10}-+-{'-'*12}-+-{'-'*10}")
    for row in summary_rows:
        print(f"{row['method']:<20} | {row['precision@5_pct']:>9.2f}%  | {row['recall@5_pct']:>9.2f}%  | {row['mrr_pct']:>7.2f}%  | {row['hit_rate@5_pct']:>9.2f}%  | {row['ndcg@5_pct']:>7.2f}%")
    print(f"================================================================================\n")

    return summary_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate TenderMind Retrieval Pipeline")
    parser.add_argument("--queries", type=str, default=None, help="Path to test_queries.json")
    parser.add_argument("--k", type=int, default=5, help="Top-K cutoff (default: 5)")
    parser.add_argument("--alpha", type=float, default=0.5, help="Hybrid alpha weight (default: 0.5)")
    parser.add_argument("--output-results", type=str, default=None, help="Output path for retrieval_results.csv")
    parser.add_argument("--output-summary", type=str, default=None, help="Output path for summary_metrics.csv")
    args = parser.parse_args()

    run_evaluation(
        queries_path=args.queries,
        output_results_path=args.output_results,
        output_summary_path=args.output_summary,
        k=args.k,
        alpha=args.alpha
    )

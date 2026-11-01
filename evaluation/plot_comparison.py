#!/usr/bin/env python3
"""
Comparative Performance Analysis Plotter
=========================================
Generates IEEE publication-quality grouped bar chart comparing:
  - BM25
  - Dense FAISS
  - Hybrid Retrieval

Across the five core metrics:
  - Precision@5
  - Recall@5
  - MRR
  - Hit Rate@5
  - nDCG@5

Outputs:
  - comparative_performance.png (300 DPI)
  - comparative_performance.svg (vector graphic for LaTeX integration)
"""

import os
import sys
import csv
import argparse
import matplotlib.pyplot as plt
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def load_summary_metrics(csv_path: str):
    """Loads metrics from summary_metrics.csv."""
    if not os.path.exists(csv_path):
        return None

    data = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            method = row["method"]
            data[method] = {
                "Precision@5": float(row.get("precision@5_pct", float(row["precision@5"]) * 100)),
                "Recall@5": float(row.get("recall@5_pct", float(row["recall@5"]) * 100)),
                "MRR": float(row.get("mrr_pct", float(row["mrr"]) * 100)),
                "Hit Rate@5": float(row.get("hit_rate@5_pct", float(row["hit_rate@5"]) * 100)),
                "nDCG@5": float(row.get("ndcg@5_pct", float(row["ndcg@5"]) * 100))
            }
    return data


def plot_comparative_performance(
    csv_path: str = None,
    output_png: str = None,
    output_svg: str = None,
    is_template: bool = False
):
    if csv_path is None:
        csv_path = os.path.join(SCRIPT_DIR, "summary_metrics.csv")
    if output_png is None:
        output_png = os.path.join(SCRIPT_DIR, "comparative_performance.png")
    if output_svg is None:
        output_svg = os.path.join(SCRIPT_DIR, "comparative_performance.svg")

    metrics_data = load_summary_metrics(csv_path)

    if metrics_data is None or len(metrics_data) == 0:
        is_template = True
        # Template placeholder data (clearly watermarked)
        methods = ["BM25", "Dense FAISS", "Hybrid Retrieval"]
        categories = ["Precision@5", "Recall@5", "MRR", "Hit Rate@5", "nDCG@5"]
        data_by_method = {
            "BM25": [0.0] * 5,
            "Dense FAISS": [0.0] * 5,
            "Hybrid Retrieval": [0.0] * 5
        }
    else:
        methods = ["BM25", "Dense FAISS", "Hybrid Retrieval"]
        categories = ["Precision@5", "Recall@5", "MRR", "Hit Rate@5", "nDCG@5"]
        data_by_method = {}
        for m in methods:
            if m in metrics_data:
                data_by_method[m] = [metrics_data[m][cat] for cat in categories]
            else:
                data_by_method[m] = [0.0] * 5

    # IEEE Publication Style configuration
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(11, 6.2), dpi=300)

    x = np.arange(len(categories))
    bar_width = 0.25

    # Professional color palette for research papers
    colors = {
        "BM25": "#2b5c8f",              # Professional steel blue
        "Dense FAISS": "#d95f02",        # Warm ochre / amber
        "Hybrid Retrieval": "#2e7d32"   # Forest emerald green
    }

    rects = []
    for i, method in enumerate(methods):
        offset = (i - 1) * bar_width
        vals = data_by_method[method]
        rect = ax.bar(
            x + offset,
            vals,
            bar_width,
            label=method,
            color=colors[method],
            edgecolor="#222222",
            linewidth=0.8,
            zorder=3
        )
        rects.append(rect)

        # Add data labels on top of bars
        for r, val in zip(rect, vals):
            height = r.get_height()
            if not is_template and height > 0:
                ax.annotate(
                    f"{val:.1f}%",
                    xy=(r.get_x() + r.get_width() / 2, height),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha='center',
                    va='bottom',
                    fontsize=9,
                    fontweight='bold',
                    color="#222222"
                )

    # Chart formatting
    ax.set_title("Comparative Performance Analysis", fontsize=15, fontweight='bold', pad=18)
    ax.set_ylabel("Score (%)", fontsize=12, fontweight='bold', labelpad=10)
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=11, fontweight='bold')
    ax.set_ylim(0, 108)

    # Gridlines and styling
    ax.yaxis.grid(True, linestyle="--", alpha=0.5, color="#cccccc", zorder=0)
    ax.xaxis.grid(False)
    ax.set_axisbelow(True)

    # Legend
    legend = ax.legend(
        loc='upper right',
        frameon=True,
        framealpha=0.95,
        facecolor="#ffffff",
        edgecolor="#cccccc",
        fontsize=10,
        title="Retrieval Methods",
        title_fontsize=11
    )
    legend.get_title().set_fontweight('bold')

    # Spines
    for spine in ax.spines.values():
        spine.set_color('#444444')
        spine.set_linewidth(1.0)

    # If template, add conspicuous watermark
    if is_template:
        ax.text(
            0.5, 0.5,
            "EVALUATION TEMPLATE\n(Awaiting Verified Ground Truth Execution)",
            transform=ax.transAxes,
            fontsize=20,
            color="red",
            alpha=0.35,
            ha="center",
            va="center",
            fontweight="bold",
            rotation=20
        )

    plt.tight_layout()

    # Save to both PNG and SVG
    fig.savefig(output_png, format="png", dpi=300, bbox_inches="tight")
    fig.savefig(output_svg, format="svg", bbox_inches="tight")
    plt.close(fig)

    print(f"[OK] High-resolution comparative graph saved to:")
    print(f"     PNG: {output_png}")
    print(f"     SVG: {output_svg}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Plot Comparative Performance Analysis")
    parser.add_argument("--csv", type=str, default=None, help="Path to summary_metrics.csv")
    parser.add_argument("--output-png", type=str, default=None, help="Output PNG path")
    parser.add_argument("--output-svg", type=str, default=None, help="Output SVG path")
    parser.add_argument("--template", action="store_true", help="Force template mode")
    args = parser.parse_args()

    plot_comparative_performance(
        csv_path=args.csv,
        output_png=args.output_png,
        output_svg=args.output_svg,
        is_template=args.template
    )

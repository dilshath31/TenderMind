from fastapi import APIRouter

router = APIRouter()

@router.get("/metrics")
def get_metrics():
    return {
        "ml": {
            "logistic_regression": {"acc": 0.76, "p": 0.74, "r": 0.78, "f1": 0.76},
            "decision_tree": {"acc": 0.68, "p": 0.65, "r": 0.71, "f1": 0.68},
            "random_forest": {"acc": 0.81, "p": 0.80, "r": 0.82, "f1": 0.81},
            "distilbert": {"acc": 0.92, "p": 0.91, "r": 0.93, "f1": 0.92}
        },
        "rag": {
            "faiss": {"p5": 0.65, "r5": 0.72, "mrr": 0.68},
            "bm25": {"p5": 0.61, "r5": 0.69, "mrr": 0.64},
            "hybrid": {"p5": 0.84, "r5": 0.89, "mrr": 0.86}
        }
    }

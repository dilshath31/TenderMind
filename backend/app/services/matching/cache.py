import os
import json
import glob

def get_cache_dir():
    cache_dir = "/data/cache" if os.environ.get("DATABASE_URL") else "d:/TenderMind/data/cache"
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir

def get_match_cache(tender_id: int, company_id: int):
    cache_path = os.path.join(get_cache_dir(), f"match_{tender_id}_{company_id}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                return json.load(f)
        except:
            return None
    return None

def save_match_cache(tender_id: int, company_id: int, data: dict):
    cache_path = os.path.join(get_cache_dir(), f"match_{tender_id}_{company_id}.json")
    try:
        with open(cache_path, "w") as f:
            json.dump(data, f)
    except:
        pass

def invalidate_company_matches(company_id: int):
    pattern = os.path.join(get_cache_dir(), f"match_*_{company_id}.json")
    for file_path in glob.glob(pattern):
        try:
            os.remove(file_path)
        except:
            pass

def invalidate_tender_matches(tender_id: int):
    pattern = os.path.join(get_cache_dir(), f"match_{tender_id}_*.json")
    for file_path in glob.glob(pattern):
        try:
            os.remove(file_path)
        except:
            pass

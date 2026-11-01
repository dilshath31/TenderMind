import requests
import time
import os

API_URL = "http://localhost:8000/api/v1"
EMAIL = "test_upload@example.com"
PASSWORD = "password123"

print("1. Registering user...")
res = requests.post(f"{API_URL}/auth/register", json={
    "email": EMAIL,
    "password": PASSWORD,
    "full_name": "Test User"
})
if res.status_code not in [200, 201, 400]:
    print("Register failed:", res.text)
    exit(1)

print("2. Logging in...")
res = requests.post(f"{API_URL}/auth/login", data={
    "username": EMAIL,
    "password": PASSWORD
})
if res.status_code != 200:
    print("Login failed:", res.text)
    exit(1)
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("3. Creating tender...")
res = requests.post(f"{API_URL}/tenders/", json={
    "title": "Test Upload Tender",
    "issuing_organization": "Test Org",
    "submission_deadline": "2026-10-01T00:00:00Z",
    "description": "Test"
}, headers=headers)
if res.status_code != 201:
    print("Tender creation failed:", res.text)
    exit(1)
tender_id = res.json()["id"]
print(f"Tender created with ID: {tender_id}")

print("4. Uploading document...")
with open("test.pdf", "wb") as f:
    f.write(b"%PDF-1.4\n%Fake PDF for testing\n")
    
with open("test.pdf", "rb") as f:
    files = {"file": ("test.pdf", f, "application/pdf")}
    res = requests.post(f"{API_URL}/tenders/{tender_id}/documents", files=files, headers=headers)

if res.status_code != 201:
    print("Upload failed:", res.status_code, res.text)
    exit(1)
doc_id = res.json()["id"]
print(f"Document uploaded with ID: {doc_id}")

print("5. Polling status...")
for i in range(10):
    time.sleep(2)
    res = requests.get(f"{API_URL}/tenders/{tender_id}/documents", headers=headers)
    docs = res.json()
    doc = next((d for d in docs if d["id"] == doc_id), None)
    if doc:
        print(f"Status: {doc['status']}")
        if doc["status"] in ["READY", "Ready", "Completed", "Processing Failed"]:
            break

print("Done.")

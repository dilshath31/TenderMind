import requests
import time
from reportlab.pdfgen import canvas

# 1. Create a simple PDF
pdf_path = "sample_tender.pdf"
c = canvas.Canvas(pdf_path)
c.drawString(100, 750, "Sample Tender Document")
c.drawString(100, 730, "Eligibility: Must have 5 years of experience.")
c.drawString(100, 710, "Requirement: ISO 9001 certification.")
c.save()

# 2. Login
base_url = "http://127.0.0.1:8000/api/v1"
res = requests.post(f"{base_url}/auth/login", data={"username": "test_argon3@example.com", "password": "password123"})
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 3. Create Tender
tender_data = {
    "title": "Automated Test Tender",
    "issuing_organization": "Test Org"
}
res = requests.post(f"{base_url}/tenders/", json=tender_data, headers=headers)
print("Created tender:", res.json())
tender_id = res.json()["id"]

# 4. Upload PDF
with open(pdf_path, "rb") as f:
    files = {"file": ("sample_tender.pdf", f, "application/pdf")}
    res = requests.post(f"{base_url}/tenders/{tender_id}/documents", files=files, headers=headers)
    print("Upload response:", res.json())

# 5. Poll for processing
for _ in range(12):
    time.sleep(5)
    res = requests.get(f"{base_url}/tenders/{tender_id}", headers=headers)
    status = res.json().get("status")
    print("Status:", status)
    if status in ["Ready", "Completed", "Analysis Available", "Processing Failed", "Failed"]:
        break

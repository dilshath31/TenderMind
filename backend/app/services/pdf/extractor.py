import fitz  # PyMuPDF
from typing import List, Dict, Any
import concurrent.futures
import os

def detect_pdf_type(file_path: str) -> str:
    """
    Lightweight detection of PDF type without full OCR.
    Checks if the PDF contains extractable text.
    """
    try:
        doc = fitz.open(file_path)
        text_length = 0
        pages_to_check = min(len(doc), 5) # Check up to first 5 pages
        for i in range(pages_to_check):
            page = doc.load_page(i)
            text_length += len(page.get_text("text").strip())
        doc.close()
        # If very little text is found compared to the number of pages, it's likely scanned
        if text_length < 50 * pages_to_check:
            return "SCANNED_PDF"
        return "TEXT_PDF"
    except Exception as e:
        print(f"Error detecting PDF type: {e}")
        return "UNKNOWN"

def _extract_page(file_path: str, page_num: int) -> Dict[str, Any]:
    # PyMuPDF requires a new doc instance per thread for thread-safety, 
    # but fitz.Document is reasonably fast to open.
    doc = fitz.open(file_path)
    page = doc.load_page(page_num)
    text = page.get_text("text")
    doc.close()
    
    cleaned_text = " ".join(text.split())
    return {
        "page_number": page_num + 1,
        "text": cleaned_text
    }

def extract_pdf_pages(file_path: str) -> List[Dict[str, Any]]:
    pages_data = []
    try:
        # Determine number of pages first
        doc = fitz.open(file_path)
        num_pages = len(doc)
        doc.close()
        
        workers = int(os.environ.get("PDF_WORKERS", 4))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            # Submit all page extraction tasks
            futures = [executor.submit(_extract_page, file_path, i) for i in range(num_pages)]
            
            # Collect results sequentially to maintain page order
            for future in futures:
                try:
                    pages_data.append(future.result())
                except Exception as e:
                    print(f"Error extracting page: {e}")
                    
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    return pages_data

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> List[str]:
    chunks = []
    if not text:
        return chunks
        
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
        
    return chunks

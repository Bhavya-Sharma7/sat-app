"""
Extract page images for graph/table Command of Evidence questions.
Saves PNG images to public/question_images/ and updates questions.json
with an image_path field.
"""

import fitz  # PyMuPDF
import json
import os
import re

QUESTIONS_PATH = "public/questions.json"
PDF_PATH = "ENG COLLEGEBOARD QBANK.pdf"
OUT_DIR = "public/question_images"
DPI = 144  # good quality, reasonable file size

DATA_PHRASES = [
    "data from the table",
    "data from the graph",
    "data in the table",
    "data in the graph",
    "the table",
    "the graph",
    "according to the table",
    "according to the graph",
]

def is_data_question(q):
    text = (q.get("question") or "").lower()
    return any(p in text for p in DATA_PHRASES)

def clean(text):
    """Remove excess whitespace for search"""
    return re.sub(r'\s+', ' ', text).strip()

def find_page_for_question(doc, q):
    """Search every page for a unique snippet of the question passage."""
    passage = q.get("question", "")
    # Take first 80 chars of passage as search anchor
    anchor = clean(passage[:80])
    if len(anchor) < 20:
        return None
    # Use first 6 significant words
    words = anchor.split()[:8]
    needle = " ".join(words)
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = clean(page.get_text("text"))
        if needle in page_text:
            return page_num
    return None

def render_page_image(doc, page_num, out_path):
    page = doc[page_num]
    mat = fitz.Matrix(DPI / 72, DPI / 72)
    clip = page.rect  # full page
    pix = page.get_pixmap(matrix=mat, clip=clip)
    pix.save(out_path)

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    with open(QUESTIONS_PATH) as f:
        questions = json.load(f)
    
    data_qs = [q for q in questions if is_data_question(q)]
    print(f"Found {len(data_qs)} data/graph/table questions to process")
    
    doc = fitz.open(PDF_PATH)
    print(f"PDF has {len(doc)} pages")
    
    found = 0
    not_found = []
    
    for q in data_qs:
        qid = q["id"]
        out_path = os.path.join(OUT_DIR, f"{qid}.png")
        
        if os.path.exists(out_path):
            q["image_path"] = f"/question_images/{qid}.png"
            found += 1
            continue
        
        page_num = find_page_for_question(doc, q)
        if page_num is not None:
            render_page_image(doc, page_num, out_path)
            q["image_path"] = f"/question_images/{qid}.png"
            found += 1
            if found % 10 == 0:
                print(f"  Processed {found}/{len(data_qs)}...")
        else:
            not_found.append(qid)
    
    doc.close()
    
    # Save updated questions.json
    with open(QUESTIONS_PATH, "w") as f:
        json.dump(questions, f)
    
    print(f"\nDone! {found} images saved, {len(not_found)} not found.")
    if not_found:
        print(f"Not found IDs: {not_found[:10]}...")

if __name__ == "__main__":
    main()

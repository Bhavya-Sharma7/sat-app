import fitz  # PyMuPDF
import sys

pdf_path = "ENG COLLEGEBOARD QBANK.pdf"
doc = fitz.open(pdf_path)

# Print total pages
print(f"Total pages: {len(doc)}")

# Extract text from a few sample pages to understand structure
with open("sample_output.txt", "w", encoding="utf-8") as f:
    for i in range(5, min(15, len(doc))):  # Skip to page 5 to get actual questions
        page = doc[i]
        text = page.get_text("text")
        f.write(f"--- PAGE {i} ---\n")
        f.write(text)
        f.write("\n\n")

print("Sample text extracted to sample_output.txt")

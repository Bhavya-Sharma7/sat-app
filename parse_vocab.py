import json
from bs4 import BeautifulSoup

file_path = "Vocab 384.rtf"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Parse the HTML content from the RTF file
soup = BeautifulSoup(content, 'html.parser')

vocab_list = []
# Find all rows in the table
rows = soup.find_all('tr')

for row in rows[1:]:  # Skip the header row
    cols = row.find_all('td')
    if len(cols) >= 3:
        word = cols[0].get_text(strip=True)
        definition = cols[1].get_text(strip=True)
        example = cols[2].get_text(strip=True)
        
        # Clean up some common RTF artifacts if they appear at the end
        if word.endswith('\\'):
            word = word[:-1].strip()
        if definition.endswith('\\'):
            definition = definition[:-1].strip()
        if example.endswith('\\'):
            example = example[:-1].strip()
            
        vocab_list.append({
            "word": word,
            "definition": definition,
            "example": example
        })

# Save to vocab.json
with open("vocab.json", "w", encoding="utf-8") as f:
    json.dump(vocab_list, f, indent=2)

print(f"Total vocabulary words parsed: {len(vocab_list)}")

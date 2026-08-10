import fitz
import json
import re

pdf_path = "ENG COLLEGEBOARD QBANK.pdf"
doc = fitz.open(pdf_path)

all_text = ""
for page in doc:
    all_text += page.get_text("text") + "\n"

# Fix common ligature issues
all_text = all_text.replace("r t", "rt").replace("f i", "fi").replace("f l", "fl")

# Split by Question ID:
chunks = all_text.split("Question ID: ")[1:]

questions = []
for chunk in chunks:
    lines = [line.strip() for line in chunk.split('\n') if line.strip()]
    
    if not lines:
        continue
        
    qid = lines[0]
    
    try:
        idx_diff = lines.index("Difficulty")
        idx_sat = lines.index("SAT", idx_diff)
        idx_rw = lines.index("Reading and Writing", idx_sat)
        idx_question = lines.index("Question", idx_rw)
        
        domain_skill_lines = lines[idx_rw + 1 : idx_question - 1]
        domain_skill_text = " ".join(domain_skill_lines)
        
        # Insert a pipe to split domain and skill
        for d in ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"]:
            if domain_skill_text.startswith("Standard English Conventions"):
                domain_skill_text = domain_skill_text.replace("Standard English Conventions", "Standard English Conventions|", 1)
                break
            elif domain_skill_text.startswith(d):
                domain_skill_text = domain_skill_text.replace(d, d + "|", 1)
                break
        
        if "|" in domain_skill_text:
            domain, skill = domain_skill_text.split('|', 1)
            domain = domain.strip()
            skill = skill.strip()
        else:
            domain = "Unknown"
            skill = domain_skill_text
            
        if skill == "Cross-text Connections":
            skill = "Cross-Text Connections"
            
        difficulty = lines[idx_question - 1]
        
        idx_correct = -1
        for i, line in enumerate(lines):
            if line.startswith("Correct Answer:"):
                idx_correct = i
                break
        
        if idx_correct == -1:
            print(f"Skipping {qid}: No 'Correct Answer:' found")
            continue
            
        idx_answer = -1
        for i in range(idx_correct - 1, -1, -1):
            if lines[i] == "Answer":
                idx_answer = i
                break
                
        idx_rationale = -1
        for i in range(idx_correct + 1, len(lines)):
            if lines[i] == "Rationale":
                idx_rationale = i
                break
                
        question_text = "\n".join(lines[idx_question+1:idx_answer])
        options_text = "\n".join(lines[idx_answer+1:idx_correct])
        correct_answer = lines[idx_correct].replace("Correct Answer:", "").strip()
        
        rationale_text = "\n".join(lines[idx_rationale+1:]) if idx_rationale != -1 else ""
        
        options = {}
        opt_matches = re.split(r'\n([A-D])\.\s', "\n" + options_text)
        if len(opt_matches) > 1:
            for i in range(1, len(opt_matches), 2):
                opt_letter = opt_matches[i]
                opt_text = opt_matches[i+1].strip()
                options[opt_letter] = opt_text
        else:
            options = {"raw": options_text}
            
        questions.append({
            "id": qid,
            "domain": domain,
            "skill": skill,
            "difficulty": difficulty,
            "question": question_text,
            "options": options,
            "correct_answer": correct_answer,
            "rationale": rationale_text
        })
    except Exception as e:
        print(f"Error parsing question ID: {qid}, error: {e}")

with open("questions.json", "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2)

print(f"Total questions parsed: {len(questions)}")

stats = {}
for q in questions:
    domain_skill = f"{q['domain']} -> {q['skill']}"
    stats[domain_skill] = stats.get(domain_skill, 0) + 1

for k, v in stats.items():
    print(f"{k}: {v}")

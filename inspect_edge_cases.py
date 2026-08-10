import json

with open("questions.json", "r") as f:
    questions = json.load(f)

for q in questions:
    if q["domain"] == "Standard English":
        print("--- Standard English chunk ---")
        print(q)
        break

for q in questions:
    if q["skill"] == "Text Structure and":
        print("--- Text Structure chunk ---")
        print(q)
        break

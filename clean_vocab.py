import json
import re

with open("vocab.json", "r") as f:
    vocab_list = json.load(f)

cleaned_vocab = []
pos_tags = ["v.", "n.", "adj.", "adv.", "prep.", "conj."]

def get_inflections(word):
    bw = word.lower()
    infl = [bw]
    if bw.endswith('e'):
        infl.extend([bw + "s", bw + "d", bw[:-1] + "ing"])
    elif bw.endswith('y'):
        if len(bw) > 1 and bw[-2] in "aeiou":
            infl.extend([bw + "s", bw + "ed", bw + "ing"])
        else:
            infl.extend([bw[:-1] + "ies", bw[:-1] + "ied", bw + "ing"])
    else:
        infl.extend([bw + "s", bw + "ed", bw + "ing", bw + bw[-1] + "ed", bw + bw[-1] + "ing"])
    
    # User also mentioned "-d" as an inflection so we'll just add it but be careful.
    # Actually, the logic above is much safer and covers standard English suffixes.
    
    infl = list(set([i for i in infl if len(i) > 2]))
    infl.sort(key=len, reverse=True)
    return infl

def fix_example_spacing(example, word):
    inflections = get_inflections(word)
    cleaned_example = example
    
    infl_pattern = "|".join([re.escape(infl) for infl in inflections])
    pattern = re.compile(f"([a-zA-Z]?)({infl_pattern})([a-zA-Z]?)", re.IGNORECASE)
    
    def repl(match):
        pre = match.group(1)
        post = match.group(3)
        
        res = pre
        if pre and pre.isalpha():
            res += " "
        res += match.group(0)[len(pre):len(match.group(0))-len(post)]
        if post and post.isalpha():
            res += " "
        res += post
        return res

    prev = ""
    while prev != cleaned_example:
        prev = cleaned_example
        cleaned_example = pattern.sub(repl, cleaned_example)
        
    return cleaned_example

for entry in vocab_list:
    word = entry["word"]
    definition = entry["definition"]
    example = entry["example"]
    
    if word.startswith("\\"): word = word[1:]
    if definition.startswith("\\"): definition = definition[1:]
    if example.startswith("\\"): example = example[1:]
        
    word = word.strip()
    definition = definition.strip()
    example = example.strip()
    
    pos = ""
    for tag in pos_tags:
        if definition.lower().startswith(tag):
            pos = tag[:-1]
            definition = definition[len(tag):].strip()
            if definition:
                definition = definition[0].upper() + definition[1:]
            break
            
    example = fix_example_spacing(example, word)
    example = example.replace("\\'92", "'")
    
    if example and example[0].islower():
        example = example[0].upper() + example[1:]
        
    cleaned_vocab.append({
        "word": word,
        "partOfSpeech": pos,
        "definition": definition,
        "example": example
    })

with open("vocab_cleaned.json", "w", encoding="utf-8") as f:
    json.dump(cleaned_vocab, f, indent=2)

print("Vocab cleaned (v3).")

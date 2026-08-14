#!/usr/bin/env python3
"""Fix ALL-CAPS calendar mood labels to Title Case in LanguageContext.tsx (en/fr/es/sw/de)."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

REPLACEMENTS = [
    # English
    ('"calendar.happy": "HAPPY",', '"calendar.happy": "Happy",'),
    ('"calendar.fine": "FINE",', '"calendar.fine": "Fine",'),
    ('"calendar.sad": "SAD",', '"calendar.sad": "Sad",'),
    # French (CONTENT/BIEN/TRISTE)
    ('"calendar.happy": "CONTENT",', '"calendar.happy": "Content",'),
    # Spanish (FELIZ/BIEN/TRISTE) — BIEN/TRISTE identical to French, replaced globally below
    ('"calendar.happy": "FELIZ",', '"calendar.happy": "Feliz",'),
    # Swahili
    ('"calendar.happy": "FURAHA",', '"calendar.happy": "Furaha",'),
    ('"calendar.fine": "SAWA",', '"calendar.fine": "Sawa",'),
    ('"calendar.sad": "HUZUNI",', '"calendar.sad": "Huzuni",'),
    # German
    ('"calendar.happy": "GLÜCKLICH",', '"calendar.happy": "Glücklich",'),
    ('"calendar.fine": "OK",', '"calendar.fine": "Ok",'),
    ('"calendar.sad": "TRAURIG",', '"calendar.sad": "Traurig",'),
    # Shared by French AND Spanish (2 occurrences each)
    ('"calendar.fine": "BIEN",', '"calendar.fine": "Bien",'),
    ('"calendar.sad": "TRISTE",', '"calendar.sad": "Triste",'),
]

count = 0
for old, new in REPLACEMENTS:
    n = content.count(old)
    if n > 0:
        content = content.replace(old, new)
        count += n
        print(f"  {n}x  {old.strip()} -> {new.strip()}")
    else:
        print(f"  MISS {old}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Total replacements: {count}")

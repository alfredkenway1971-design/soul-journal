#!/usr/bin/env python3
"""Insert entry.voiceLongHint after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

BLOCKS = [
    ("No preference", "This can take up to a minute for longer entries"),
    ("Pas de préférence", "Cela peut prendre jusqu'à une minute pour les longues entrées"),
    ("Sin preferencia", "Esto puede tardar hasta un minuto en entradas largas"),
    ("بدون تفضيل", "قد يستغرق هذا ما يصل إلى دقيقة للمدخلات الطويلة"),
    ("无偏好", "较长的日记可能需要最多一分钟"),
    ("特になし", "長いエントリーは最大1分かかることがあります"),
    ("Bila upendeleo", "Hii inaweza kuchukua hadi dakika moja kwa maingizo marefu"),
    ("Keine Präferenz", "Bei längeren Einträgen kann dies bis zu einer Minute dauern"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for wv, hint in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = f'    "entry.voiceLongHint": "{hint}",\n'
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

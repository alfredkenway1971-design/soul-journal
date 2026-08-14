#!/usr/bin/env python3
"""Insert Smart Prompts + Block Breaker i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview value, promptsTitle, promptsRefresh, promptsGenerating, blockTitle, blockStarter, blockPhoto, blockWord)
BLOCKS = [
    ("No preference",
     "Need Inspiration?", "Refresh", "Generating prompts...",
     "Stuck? Try one of these", "Sentence starter", "Write about a photo", "One word"),
    ("Pas de préférence",
     "Besoin d'inspiration ?", "Actualiser", "Génération des suggestions...",
     "Blocage ? Essayez ceci", "Début de phrase", "Écrire à propos d'une photo", "Un mot"),
    ("Sin preferencia",
     "¿Necesitas inspiración?", "Actualizar", "Generando sugerencias...",
     "¿Atascado? Prueba esto", "Inicio de frase", "Escribe sobre una foto", "Una palabra"),
    ("بدون تفضيل",
     "بحاجة إلى إلهام؟", "تحديث", "جارٍ إنشاء الاقتراحات...",
     "عالق؟ جرّب هذا", "بداية جملة", "اكتب عن صورة", "كلمة واحدة"),
    ("无偏好",
     "需要灵感吗？", "刷新", "正在生成提示...",
     "卡住了？试试这些", "句子开头", "写一张照片", "一个词"),
    ("特になし",
     "インスピレーションが必要？", "更新", "プロンプトを生成中...",
     "行き詰まった？試してみて", "文の出だし", "写真について書く", "一言"),
    ("Bila upendeleo",
     "Unahitaji msukumo?", "Onyesha upya", "Inatengeneza mapendekezo...",
     "Umekwama? Jaribu hizi", "Mwanzo wa sentensi", "Andika kuhusu picha", "Neno moja"),
    ("Keine Präferenz",
     "Brauchst du Inspiration?", "Aktualisieren", "Vorschläge werden generiert...",
     "Festgefahren? Versuch das", "Satzanfang", "Über ein Foto schreiben", "Ein Wort"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, title, refresh, gen, blk, starter, photo, word) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Smart Journaling Prompts + Writing Block Breaker\n'
        f'    "record.promptsTitle": "{title}",\n'
        f'    "record.promptsRefresh": "{refresh}",\n'
        f'    "record.promptsGenerating": "{gen}",\n'
        f'    "record.blockBreakerTitle": "{blk}",\n'
        f'    "record.blockStarter": "{starter}",\n'
        f'    "record.blockPhoto": "{photo}",\n'
        f'    "record.blockWord": "{word}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted key blocks: {inserted}/8")

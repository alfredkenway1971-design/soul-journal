#!/usr/bin/env python3
"""Insert Library pagination i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, entriesCount, loadMore, loadingMore)
BLOCKS = [
    ("No preference", "{n} entries", "Load more", "Loading..."),
    ("Pas de préférence", "{n} entrées", "Charger plus", "Chargement..."),
    ("Sin preferencia", "{n} entradas", "Cargar más", "Cargando..."),
    ("بدون تفضيل", "{n} مدخلات", "تحميل المزيد", "جارٍ التحميل..."),
    ("无偏好", "{n} 条日记", "加载更多", "加载中..."),
    ("特になし", "{n}件のエントリー", "もっと見る", "読み込み中..."),
    ("Bila upendeleo", "Maingizo {n}", "Pakia zaidi", "Inapakia..."),
    ("Keine Präferenz", "{n} Einträge", "Mehr laden", "Wird geladen..."),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, count, more, loading) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Library pagination\n'
        f'    "library.entriesCount": "{count}",\n'
        f'    "library.loadMore": "{more}",\n'
        f'    "library.loadingMore": "{loading}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

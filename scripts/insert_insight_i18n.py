#!/usr/bin/env python3
"""Insert insight.* i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx (all 8 blocks)."""
import re

PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# Per-language values for the new keys (key -> {lang -> value})
BLOCKS = [
    # (worldviewNoPref value, insight.tapToJournal, insight.patternNoticed, insight.viewInsights, record.generatingInsight)
    ("No preference", "Tap to start journaling", "Pattern Noticed", "View Insights", "Generating your Ai Insight..."),
    ("Pas de préférence", "Touchez pour commencer", "Motif Remarqué", "Voir Les Aperçus", "Génération de votre aperçu Ai..."),
    ("Sin preferencia", "Toca para empezar", "Patrón Detectado", "Ver Perspectivas", "Generando tu perspectiva Ai..."),
    ("بدون تفضيل", "اضغط لبدء الكتابة", "نمط ملحوظ", "عرض الرؤى", "جارٍ إنشاء رؤية Ai الخاصة بك..."),
    ("无偏好", "点击开始写日记", "发现规律", "查看洞察", "正在生成你的 Ai 洞察..."),
    ("特になし", "タップして始める", "気づいたパターン", "インサイトを見る", "Ai インサイトを生成中..."),
    ("Bila upendeleo", "Gusa kuanza", "Muundo Umeonekana", "Tazama Maarifa", "Inatengeneza maarifa yako ya Ai..."),
    ("Keine Präferenz", "Tippen zum Starten", "Muster Erkannt", "Einblicke Anzeigen", "Dein Ai-Einblick wird generiert..."),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for worldview_value, tap, pattern, view, generating in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{worldview_value}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {worldview_value}")
        continue
    block = (
        f'    // Ai Insight card\n'
        f'    "insight.badge": "Ai Insight",\n'
        f'    "insight.tapToJournal": "{tap}",\n'
        f'    "insight.patternNoticed": "{pattern}",\n'
        f'    "insight.viewInsights": "{view}",\n'
        f'    "record.generatingInsight": "{generating}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted key blocks: {inserted}/8")

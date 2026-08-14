#!/usr/bin/env python3
"""Insert Emotional Forecasting i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, title, suggestionLabel, settingsTitle, settingsDesc)
BLOCKS = [
    ("No preference",
     "This Week's Forecast", "Suggestion",
     "Emotional Forecast", "A Monday forecast inside your weekly review when your entries show a declining trend"),
    ("Pas de préférence",
     "Prévisions de la semaine", "Suggestion",
     "Prévision émotionnelle", "Une prévision du lundi dans votre bilan hebdomadaire lorsque vos entrées montrent une tendance à la baisse"),
    ("Sin preferencia",
     "Pronóstico de la semana", "Sugerencia",
     "Pronóstico emocional", "Un pronóstico del lunes dentro de tu revisión semanal cuando tus entradas muestran una tendencia descendente"),
    ("بدون تفضيل",
     "توقعات هذا الأسبوع", "اقتراح",
     "التوقع العاطفي", "توقع يوم الاثنين داخل مراجعتك الأسبوعية عندما تُظهر مدخلاتك اتجاهًا هبوطيًا"),
    ("无偏好",
     "本周预测", "建议",
     "情绪预测", "当你的日记显示下降趋势时，每周回顾中会出现周一的预测"),
    ("特になし",
     "今週の予報", "提案",
     "感情予報", "エントリーに下降傾向が見られるとき、週次レビュー内に月曜の予報を表示します"),
    ("Bila upendeleo",
     "Utabiri wa Wiki Hii", "Pendekezo",
     "Utabiri wa Hisia", "Utabiri wa Jumatatu ndani ya ukaguzi wako wa kila wiki wakati maingizo yako yanaonyesha mwelekeo wa kushuka"),
    ("Keine Präferenz",
     "Prognose der Woche", "Vorschlag",
     "Emotionale Prognose", "Eine Montags-Prognose in deiner Wochenübersicht, wenn deine Einträge einen Abwärtstrend zeigen"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, title, sug, sTitle, sDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Emotional Forecasting\n'
        f'    "weekly.forecastTitle": "{title}",\n'
        f'    "weekly.forecastSuggestion": "{sug}",\n'
        f'    "settings.emotionalForecast": "{sTitle}",\n'
        f'    "settings.emotionalForecastDesc": "{sDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

#!/usr/bin/env python3
"""Insert Predictive Mood Alert i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, label, desc, body)
BLOCKS = [
    ("No preference",
     "Predictive Mood Alerts",
     "A gentle heads-up when your journal shows a recurring low-mood pattern — max one per day",
     "Your journal shows you tend to feel lower on {weekday}s. Plan something gentle for yourself that day — a short walk, a call with a friend, or 5 minutes of quiet."),
    ("Pas de préférence",
     "Alertes d'humeur prédictives",
     "Une alerte douce quand votre journal montre un schéma d'humeur basse récurrent — max 1 par jour",
     "Votre journal montre que vous avez tendance à aller moins bien le {weekday}. Prévoyez quelque chose de doux ce jour-là — une petite marche, un appel à un proche, ou 5 minutes de calme."),
    ("Sin preferencia",
     "Alertas de ánimo predictivas",
     "Un aviso amable cuando tu diario muestra un patrón recurrente de ánimo bajo — máximo 1 al día",
     "Tu diario muestra que sueles sentirte más bajo el día {weekday}. Planea algo agradable para ese día: un paseo corto, una llamada a un amigo o 5 minutos de calma."),
    ("بدون تفضيل",
     "تنبيهات الحالة المزاجية التنبؤية",
     "تنبيه لطيف عندما يُظهر دفترك نمطًا متكررًا من المزاج المنخفض — مرة واحدة يوميًا",
     "يُظهر دفترك أنك تميل للشعور بانخفاض المزاج يوم {weekday}. خطط لشيء لطيف في ذلك اليوم — نزهة قصيرة، مكالمة مع صديق، أو 5 دقائق من الهدوء."),
    ("无偏好",
     "情绪预测提醒",
     "当你的日记显示重复出现的低情绪模式时，温和提醒——每天最多一条",
     "你的日记显示你在{weekday}情绪较低。为那天安排一些温柔的事——散步、给朋友打个电话，或安静5分钟。"),
    ("特になし",
     "気分予測アラート",
     "日記に繰り返しの気分低下パターンが見られたときの優しいお知らせ——1日最大1回",
     "日記によると、{weekday}は気分が下がりがちです。その日は優しい予定を——短い散歩、友人への電話、5分の静けさを。"),
    ("Bila upendeleo",
     "Tahadharifu za Hali ya Hisia",
     "Onyo la upole wakati jarida lako linaonyesha muundo wa hisia za chini — moja kwa siku",
     "Jarida lako linaonyesha huwa unahisi chini siku za {weekday}. Panga kitu kizuri siku hiyo — matembezi mafupi, simu kwa rafiki, au dakika 5 za utulivu."),
    ("Keine Präferenz",
     "Stimmungs-Prognosen",
     "Ein sanfter Hinweis, wenn dein Journal ein wiederkehrendes Tief-Muster zeigt — max. 1 pro Tag",
     "Dein Journal zeigt, dass du an {weekday} eher schlechter drauf bist. Plane etwas Sanftes für diesen Tag — einen kurzen Spaziergang, einen Anruf bei einem Freund oder 5 Minuten Ruhe."),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, label, desc, body) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Predictive Mood Alerts\n'
        f'    "settings.predictiveMood": "{label}",\n'
        f'    "settings.predictiveMoodDesc": "{desc}",\n'
        f'    "alert.predictiveBody": "{body}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

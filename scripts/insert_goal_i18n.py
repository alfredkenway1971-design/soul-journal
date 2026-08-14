#!/usr/bin/env python3
"""Insert Goal Accountability i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, checkIn, nudge, celebrate, view, goalsTitle, onTrack, attention, celebrating, aiPrefs, gaTitle, gaDesc)
BLOCKS = [
    ("No preference",
     "Goal Check-In", "You wanted to {goal}. It's been a week without mentioning it — ready to pick it back up today?",
     "Bravo! You mentioned {goal} {count}× this week — you're making real progress.",
     "View goals", "Goals", "On track", "Needs attention", "Celebrating",
     "AI Preferences", "Goal Accountability Partner", "Gentle nudges and celebrations about your goals"),
    ("Pas de préférence",
     "Suivi des objectifs", "Vous vouliez {goal}. Cela fait une semaine sans en parler — envie de vous y remettre aujourd'hui ?",
     "Bravo ! Vous avez mentionné {goal} {count} fois cette semaine — vous avancez bien.",
     "Voir les objectifs", "Objectifs", "En bonne voie", "À relancer", "En fête",
     "Préférences IA", "Partenaire de responsabilité", "Relances douces et célébrations sur vos objectifs"),
    ("Sin preferencia",
     "Seguimiento de objetivos", "Querías {goal}. Llevas una semana sin mencionarlo, ¿listo para retomarlo hoy?",
     "¡Bravo! Mencionaste {goal} {count} veces esta semana: vas avanzando de verdad.",
     "Ver objetivos", "Objetivos", "En camino", "Necesita atención", "Celebrando",
     "Preferencias de IA", "Compañero de objetivos", "Empujones amables y celebraciones sobre tus objetivos"),
    ("بدون تفضيل",
     "متابعة الأهداف", "كنت تريد {goal}. مر أسبوع دون ذكره — هل أنت مستعد للعودة إليه اليوم؟",
     "أحسنت! ذكرت {goal} {count} مرات هذا الأسبوع — أنت تتقدم حقًا.",
     "عرض الأهداف", "الأهداف", "على المسار", "بحاجة إلى اهتمام", "احتفال",
     "تفضيلات الذكاء الاصطناعي", "شريك الالتزام بالأهداف", "تذكيرات لطيفة واحتفالات بشأن أهدافك"),
    ("无偏好",
     "目标检查", "你想过{goal}。已经一周没提到了——准备好今天重新开始了吗？",
     "太棒了！这周你提到了{goal} {count}次——你正在真正进步。",
     "查看目标", "目标", "进展顺利", "需要关注", "庆祝中",
     "AI 偏好", "目标问责伙伴", "关于目标的温和提醒与庆祝"),
    ("特になし",
     "目標チェックイン", "{goal}を目指していましたね。1週間触れていないようです——今日また始めてみませんか？",
     "すごい！今週{goal}を{count}回も書いていますね——着実に進んでいます。",
     "目標を見る", "目標", "順調", "注意が必要", "お祝い",
     "AI設定", "目標サポート", "目標に関する優しいリマインドとお祝い"),
    ("Bila upendeleo",
     "Ukaguzi wa Malengo", "Ulitaka {goal}. Ni wiki moja bila kulitaja — uko tayari kuirejea leo?",
     "Hongera! Umetaja {goal} mara {count} wiki hii — unaendelea vizuri.",
     "Angalia malengo", "Malengo", "Kwenye njia", "Inahitaji umakini", "Kusherehekea",
     "Mapendeleo ya AI", "Mshirika wa Malengo", "Vikumbusho vya upole na sherehe kuhusu malengo yako"),
    ("Keine Präferenz",
     "Ziel-Check-in", "Du wolltest {goal}. Eine Woche ohne Erwähnung — bereit, heute wieder einzusteigen?",
     "Bravo! Du hast {goal} diese Woche {count}-mal erwähnt — du machst echte Fortschritte.",
     "Ziele ansehen", "Ziele", "Auf Kurs", "Braucht Aufmerksamkeit", "Feiern",
     "KI-Einstellungen", "Ziel-Partner", "Sanfte Erinnerungen und Feiern zu deinen Zielen"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, checkIn, nudge, celebrate, view, goalsTitle, onTrack, attention, celebrating, aiPrefs, gaTitle, gaDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Goal Accountability Partner\n'
        f'    "home.goalCheckIn": "{checkIn}",\n'
        f'    "home.goalNudge": "{nudge}",\n'
        f'    "home.goalCelebrate": "{celebrate}",\n'
        f'    "home.goalView": "{view}",\n'
        f'    "profile.goalsTitle": "{goalsTitle}",\n'
        f'    "profile.goalOnTrack": "{onTrack}",\n'
        f'    "profile.goalAttention": "{attention}",\n'
        f'    "profile.goalCelebrating": "{celebrating}",\n'
        f'    "settings.aiPrefs": "{aiPrefs}",\n'
        f'    "settings.goalAccountability": "{gaTitle}",\n'
        f'    "settings.goalAccountabilityDesc": "{gaDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

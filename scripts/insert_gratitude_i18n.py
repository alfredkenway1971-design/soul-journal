#!/usr/bin/env python3
"""Insert Gratitude Auto-Detection i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, title, subtitle, refresh, summary, mentions, emptyTitle, empty, sources, disabled,
#  catPeople, catExperiences, catSmall, catAchievements, catOther, settingsTitle, settingsDesc)
BLOCKS = [
    ("No preference",
     "Gratitude Timeline", "What you were grateful for", "Scan again",
     "{count} grateful moments found", "{count} total mentions in your entries",
     "No gratitude found yet", "Write about what you're thankful for and it will appear here.",
     "Source entries", "Gratitude Timeline is turned off — enable it in Settings > AI Preferences.",
     "People", "Experiences", "Small moments", "Achievements", "Other",
     "Gratitude Timeline", "Automatically collect what you're grateful for from your entries"),
    ("Pas de préférence",
     "Chronologie de gratitude", "Ce pour quoi vous étiez reconnaissant", "Relancer l'analyse",
     "{count} moments de gratitude trouvés", "{count} mentions au total dans vos entrées",
     "Aucune gratitude trouvée pour l'instant", "Écrivez ce qui vous rend reconnaissant et cela apparaîtra ici.",
     "Entrées sources", "La chronologie de gratitude est désactivée — activez-la dans Réglages > Préférences IA.",
     "Personnes", "Expériences", "Petits moments", "Réussites", "Autre",
     "Chronologie de gratitude", "Collecte automatiquement ce pour quoi vous êtes reconnaissant dans vos entrées"),
    ("Sin preferencia",
     "Línea de gratitud", "Por lo que estuviste agradecido", "Escanear de nuevo",
     "{count} momentos de gratitud encontrados", "{count} menciones en total en tus entradas",
     "Aún no hay gratitud", "Escribe sobre lo que agradeces y aparecerá aquí.",
     "Entradas de origen", "La línea de gratitud está desactivada — actívala en Ajustes > Preferencias de IA.",
     "Personas", "Experiencias", "Pequeños momentos", "Logros", "Otros",
     "Línea de gratitud", "Recoge automáticamente lo que agradeces de tus entradas"),
    ("بدون تفضيل",
     "خط زمني للامتنان", "ما كنت ممتنًا له", "إعادة الفحص",
     "تم العثور على {count} لحظة امتنان", "{count} إشارة إجمالاً في مدخلاتك",
     "لا يوجد امتنان بعد", "اكتب عما تشعر بالامتنان له وسيظهر هنا.",
     "المدخلات المصدرية", "الخط الزمني للامتنان معطل — فعّله في الإعدادات > تفضيلات الذكاء الاصطناعي.",
     "الأشخاص", "التجارب", "لحظات صغيرة", "الإنجازات", "أخرى",
     "خط زمني للامتنان", "يجمع تلقائيًا ما تشعر بالامتنان له من مدخلاتك"),
    ("无偏好",
     "感恩时间线", "你感恩的事情", "重新扫描",
     "找到{count}个感恩时刻", "你的日记中共有{count}次提及",
     "尚未发现感恩内容", "写下你感恩的事情，它就会出现在这里。",
     "来源日记", "感恩时间线已关闭 — 请在设置 > AI 偏好中启用。",
     "人", "经历", "小瞬间", "成就", "其他",
     "感恩时间线", "自动从你的日记中收集感恩的内容"),
    ("特になし",
     "感謝のタイムライン", "感謝していたこと", "再スキャン",
     "{count}件の感謝の瞬間が見つかりました", "エントリー全体で{count}回の言及",
     "まだ感謝は見つかりません", "感謝していることを書くと、ここに表示されます。",
     "元のエントリー", "感謝タイムラインはオフです — 設定 > AI設定で有効にしてください。",
     "人", "経験", "小さな瞬間", "達成", "その他",
     "感謝のタイムライン", "エントリーから感謝していることを自動収集します"),
    ("Bila upendeleo",
     "Mratibu wa Shukrani", "Mambo uliyoshukuru", "Changanua tena",
     "Nyakati {count} za shukrani zimepatikana", "Mataja {count} kwa jumla katika maingizo yako",
     "Hakuna shukrani bado", "Andika kuhusu unachoshukuru na litaonekana hapa.",
     "Maingizo chanzo", "Mratibu wa Shukrani umezimwa — washa katika Mipangilio > Mapendeleo ya AI.",
     "Watu", "Uzoefu", "Nyakati ndogo", "Mafanikio", "Nyingine",
     "Mratibu wa Shukrani", "Hukusanya kiotomatiki unachoshukuru kutoka kwa maingizo yako"),
    ("Keine Präferenz",
     "Dankbarkeits-Zeitleiste", "Wofür du dankbar warst", "Erneut scannen",
     "{count} dankbare Momente gefunden", "{count} Erwähnungen insgesamt in deinen Einträgen",
     "Noch keine Dankbarkeit gefunden", "Schreib auf, wofür du dankbar bist, und es erscheint hier.",
     "Quell-Einträge", "Die Dankbarkeits-Zeitleiste ist deaktiviert — aktiviere sie unter Einstellungen > KI-Einstellungen.",
     "Menschen", "Erlebnisse", "Kleine Momente", "Erfolge", "Anderes",
     "Dankbarkeits-Zeitleiste", "Sammelt automatisch, wofür du dankbar bist, aus deinen Einträgen"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, title, subtitle, refresh, summary, mentions, emptyTitle, empty, sources, disabled,
      catPeople, catExp, catSmall, catAch, catOther, sTitle, sDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Gratitude Auto-Detection\n'
        f'    "gratitude.title": "{title}",\n'
        f'    "gratitude.subtitle": "{subtitle}",\n'
        f'    "gratitude.refresh": "{refresh}",\n'
        f'    "gratitude.summary": "{summary}",\n'
        f'    "gratitude.mentions": "{mentions}",\n'
        f'    "gratitude.emptyTitle": "{emptyTitle}",\n'
        f'    "gratitude.empty": "{empty}",\n'
        f'    "gratitude.sources": "{sources}",\n'
        f'    "gratitude.disabled": "{disabled}",\n'
        f'    "gratitude.category.people": "{catPeople}",\n'
        f'    "gratitude.category.experiences": "{catExp}",\n'
        f'    "gratitude.category.small-moments": "{catSmall}",\n'
        f'    "gratitude.category.achievements": "{catAch}",\n'
        f'    "gratitude.category.other": "{catOther}",\n'
        f'    "settings.gratitudeTimeline": "{sTitle}",\n'
        f'    "settings.gratitudeTimelineDesc": "{sDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

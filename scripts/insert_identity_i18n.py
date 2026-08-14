#!/usr/bin/env python3
"""Insert identity/redo-onboarding i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx (all 8 blocks)."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldviewNoPref value, identityPath, redoOnboarding, redoConfirmTitle, redoConfirmDesc, redoConfirmAction, profileEmail, personalitySummary, summaryMissing)
BLOCKS = [
    ("No preference",
     "Identity & Path", "Redo Onboarding", "Start onboarding over?",
     "Your personality summary and onboarding answers will be cleared. Your entries are kept.",
     "Yes, redo it", "Email", "Ai Personality Summary",
     "Complete onboarding to generate your personality summary."),
    ("Pas de préférence",
     "Identité & Parcours", "Refaire l'intégration", "Recommencer l'intégration ?",
     "Votre résumé de personnalité et vos réponses seront effacés. Vos entrées sont conservées.",
     "Oui, recommencer", "Courriel", "Résumé de personnalité Ai",
     "Terminez l'intégration pour générer votre résumé de personnalité."),
    ("Sin preferencia",
     "Identidad y Camino", "Rehacer incorporación", "¿Empezar la incorporación de nuevo?",
     "Se borrarán tu resumen de personalidad y tus respuestas. Tus entradas se conservan.",
     "Sí, rehacerlo", "Correo", "Resumen de personalidad Ai",
     "Completa la incorporación para generar tu resumen de personalidad."),
    ("بدون تفضيل",
     "الهوية والمسار", "إعادة الإعداد", "بدء الإعداد من جديد؟",
     "سيتم مسح ملخص شخصيتك وإجاباتك. سيتم الاحتفاظ بمدخلاتك.",
     "نعم، أعد ذلك", "البريد الإلكتروني", "ملخص الشخصية Ai",
     "أكمل الإعداد لإنشاء ملخص شخصيتك."),
    ("无偏好",
     "身份与路径", "重新引导", "重新开始引导？",
     "你的个性总结和引导回答将被清除。你的日记会被保留。",
     "是的，重新开始", "邮箱", "Ai 个性总结",
     "完成引导以生成你的个性总结。"),
    ("特になし",
     "アイデンティティと道", "セットアップをやり直す", "セットアップをやり直しますか？",
     "性格サマリーと回答は消去されます。エントリーは保持されます。",
     "はい、やり直す", "メール", "Ai 性格サマリー",
     "セットアップを完了して性格サマリーを生成してください。"),
    ("Bila upendeleo",
     "Utambulisho na Njia", "Rudia Kuongozwa", "Anza kuongozwa upya?",
     "Muhtasari wako wa utu na majibu yatafutwa. Maingizo yako yanahifadhiwa.",
     "Ndio, rudia", "Barua pepe", "Muhtasari wa utu wa Ai",
     "Kamilisha kuongozwa ili kuzalisha muhtasari wako wa utu."),
    ("Keine Präferenz",
     "Identität & Weg", "Onboarding wiederholen", "Onboarding neu starten?",
     "Deine Persönlichkeitsübersicht und Antworten werden gelöscht. Deine Einträge bleiben erhalten.",
     "Ja, wiederholen", "E-Mail", "Ai-Persönlichkeitsübersicht",
     "Schließe das Onboarding ab, um deine Persönlichkeitsübersicht zu erstellen."),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, identity_path, redo, redo_title, redo_desc, redo_action, email, summary, summary_missing) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Identity & Path + Redo onboarding\n'
        f'    "settings.identityPath": "{identity_path}",\n'
        f'    "settings.redoOnboarding": "{redo}",\n'
        f'    "settings.redoConfirmTitle": "{redo_title}",\n'
        f'    "settings.redoConfirmDesc": "{redo_desc}",\n'
        f'    "settings.redoConfirmAction": "{redo_action}",\n'
        f'    "profile.email": "{email}",\n'
        f'    "profile.personalitySummary": "{summary}",\n'
        f'    "profile.summaryMissing": "{summary_missing}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted key blocks: {inserted}/8")

#!/usr/bin/env python3
"""Insert Soul Mirror i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, title, subtitle, premiumDesc, homeTagline, secEmo, secHidden, secGoals, secJoy, secGrowth, secChapter,
#  imp, dec, stable, expImg, expPdf, disclaimer, generating, regenerate, emptyTitle, empty, sTitle, sDesc)
BLOCKS = [
    ("No preference",
     "Soul Mirror", "Your monthly portrait", "A beautiful monthly portrait of your emotional life — a Premium feature.",
     "Your monthly portrait of this season of life",
     "Emotional Summary", "Hidden Patterns", "Goal Progress", "Sources of Joy", "Growth Area", "Life Chapter",
     "Improving", "Declining", "Stable", "Export as Image", "Export as PDF",
     "This analysis is based on your entries, not a medical diagnosis.",
     "Creating your portrait...", "Regenerate this month",
     "No entries this month", "Write a few entries during the month and your portrait will appear here.",
     "Soul Mirror", "Your monthly emotional portrait (premium)"),
    ("Pas de préférence",
     "Miroir de l'âme", "Votre portrait mensuel", "Un magnifique portrait mensuel de votre vie émotionnelle — une fonctionnalité Premium.",
     "Votre portrait mensuel de cette saison de vie",
     "Résumé émotionnel", "Schémas cachés", "Progression des objectifs", "Sources de joie", "Domaine de croissance", "Chapitre de vie",
     "En amélioration", "En baisse", "Stable", "Exporter en image", "Exporter en PDF",
     "Cette analyse est basée sur vos entrées, pas un diagnostic médical.",
     "Création de votre portrait...", "Régénérer ce mois",
     "Aucune entrée ce mois-ci", "Écrivez quelques entrées pendant le mois et votre portrait apparaîtra ici.",
     "Miroir de l'âme", "Votre portrait émotionnel mensuel (premium)"),
    ("Sin preferencia",
     "Espejo del alma", "Tu retrato mensual", "Un hermoso retrato mensual de tu vida emocional — una función Premium.",
     "Tu retrato mensual de esta estación de la vida",
     "Resumen emocional", "Patrones ocultos", "Progreso de objetivos", "Fuentes de alegría", "Área de crecimiento", "Capítulo de vida",
     "Mejorando", "Disminuyendo", "Estable", "Exportar como imagen", "Exportar como PDF",
     "Este análisis se basa en tus entradas, no es un diagnóstico médico.",
     "Creando tu retrato...", "Regenerar este mes",
     "Sin entradas este mes", "Escribe algunas entradas durante el mes y tu retrato aparecerá aquí.",
     "Espejo del alma", "Tu retrato emocional mensual (premium)"),
    ("بدون تفضيل",
     "مرآة الروح", "صورتك الشهرية", "صورة شهرية جميلة لحياتك العاطفية — ميزة بريميوم.",
     "صورتك الشهرية لهذا الموسم من الحياة",
     "الملخص العاطفي", "الأنماط الخفية", "تقدم الأهداف", "مصادر الفرح", "مجال النمو", "فصل الحياة",
     "في تحسن", "في انخفاض", "مستقر", "تصدير كصورة", "تصدير كملف PDF",
     "يعتمد هذا التحليل على مدخلاتك، وليس تشخيصًا طبيًا.",
     "جارٍ إنشاء صورتك...", "إعادة إنشاء هذا الشهر",
     "لا توجد مدخلات هذا الشهر", "اكتب بضع مدخلات خلال الشهر وستظهر صورتك هنا.",
     "مرآة الروح", "صورتك العاطفية الشهرية (بريميوم)"),
    ("无偏好",
     "灵魂之镜", "你的月度画像", "关于你情感生活的美丽月度画像——高级功能。",
     "你人生这一季的月度画像",
     "情感总结", "隐藏模式", "目标进展", "快乐之源", "成长领域", "人生章节",
     "改善中", "下降中", "稳定", "导出为图片", "导出为PDF",
     "此分析基于你的日记，而非医学诊断。",
     "正在创建你的画像...", "重新生成本月",
     "本月没有日记", "在当月写几篇日记，你的画像就会出现在这里。",
     "灵魂之镜", "你的月度情感画像（高级）"),
    ("特になし",
     "ソウルミラー", "あなたの月間ポートレート", "あなたの感情生活を映す美しい月間ポートレート — プレミアム機能。",
     "人生のこの季節の月間ポートレート",
     "感情サマリー", "隠れたパターン", "目標の進捗", "喜びの源", "成長の領域", "人生の章",
     "改善中", "下降中", "安定", "画像として書き出し", "PDFとして書き出し",
     "この分析はあなたのエントリーに基づくものであり、医学的診断ではありません。",
     "ポートレートを作成中...", "今月を再生成",
     "今月のエントリーはありません", "月の間にいくつか書くと、ここにポートレートが表示されます。",
     "ソウルミラー", "あなたの月間感情ポートレート（プレミアム）"),
    ("Bila upendeleo",
     "Kioo cha Roho", "Picha yako ya mwezi", "Picha nzuri ya kila mwezi ya maisha yako ya kihisia — kipengele cha Premium.",
     "Picha yako ya kila mwezi ya msimu huu wa maisha",
     "Muhtasari wa Kihisia", "Mifumo Iliyofichika", "Maendeleo ya Malengo", "Vyanzo vya Furaha", "Eneo la Ukuaji", "Sura ya Maisha",
     "Inaboreka", "Inashuka", "Imara", "Hamisha kama Picha", "Hamisha kama PDF",
     "Uchambuzi huu unategemea maingizo yako, si utambuzi wa kimatibabu.",
     "Inaunda picha yako...", "Tengeneza tena mwezi huu",
     "Hakuna maingizo mwezi huu", "Andika maingizo machache wakati wa mwezi na picha yako itaonekana hapa.",
     "Kioo cha Roho", "Picha yako ya kihisia ya kila mwezi (premium)"),
    ("Keine Präferenz",
     "Seelenspiegel", "Dein monatliches Porträt", "Ein wunderschönes monatliches Porträt deines Gefühlslebens — ein Premium-Feature.",
     "Dein monatliches Porträt dieser Lebensphase",
     "Emotionale Zusammenfassung", "Verborgene Muster", "Ziel-Fortschritt", "Freudenquellen", "Wachstumsbereich", "Lebenskapitel",
     "Verbessert", "Rückläufig", "Stabil", "Als Bild exportieren", "Als PDF exportieren",
     "Diese Analyse basiert auf deinen Einträgen, nicht auf einer medizinischen Diagnose.",
     "Dein Porträt wird erstellt...", "Diesen Monat neu generieren",
     "Keine Einträge in diesem Monat", "Schreib ein paar Einträge im Monat und dein Porträt erscheint hier.",
     "Seelenspiegel", "Dein monatliches Gefühlsporträt (Premium)"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, title, subtitle, premiumDesc, homeTagline, secEmo, secHidden, secGoals, secJoy, secGrowth, secChapter,
      imp, dec, stable, expImg, expPdf, disclaimer, generating, regenerate, emptyTitle, empty, sTitle, sDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Soul Mirror (monthly portrait)\n'
        f'    "soulMirror.title": "{title}",\n'
        f'    "soulMirror.subtitle": "{subtitle}",\n'
        f'    "soulMirror.premiumDesc": "{premiumDesc}",\n'
        f'    "soulMirror.homeTagline": "{homeTagline}",\n'
        f'    "soulMirror.sectionEmotional": "{secEmo}",\n'
        f'    "soulMirror.sectionHidden": "{secHidden}",\n'
        f'    "soulMirror.sectionGoals": "{secGoals}",\n'
        f'    "soulMirror.sectionJoy": "{secJoy}",\n'
        f'    "soulMirror.sectionGrowth": "{secGrowth}",\n'
        f'    "soulMirror.sectionChapter": "{secChapter}",\n'
        f'    "soulMirror.trajectory.improving": "{imp}",\n'
        f'    "soulMirror.trajectory.declining": "{dec}",\n'
        f'    "soulMirror.trajectory.stable": "{stable}",\n'
        f'    "soulMirror.exportImage": "{expImg}",\n'
        f'    "soulMirror.exportPdf": "{expPdf}",\n'
        f'    "soulMirror.disclaimer": "{disclaimer}",\n'
        f'    "soulMirror.generating": "{generating}",\n'
        f'    "soulMirror.regenerate": "{regenerate}",\n'
        f'    "soulMirror.emptyTitle": "{emptyTitle}",\n'
        f'    "soulMirror.empty": "{empty}",\n'
        f'    "settings.soulMirror": "{sTitle}",\n'
        f'    "settings.soulMirrorDesc": "{sDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

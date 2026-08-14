#!/usr/bin/env python3
"""Insert Relationship Tracker i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, title, private, refresh, mentions, sources, delete, disable, disabled, emptyTitle, empty, noInsight, sTitle, sDesc)
BLOCKS = [
    ("No preference",
     "Relations", "Private — only visible to you", "Scan again", "{count} mentions",
     "Source entries", "Delete from tracking", "Turn off Relationship Tracking",
     "Relationship tracking is turned off. Enable it in Settings > AI Preferences.",
     "No relations tracked yet",
     "People you mention 3+ times in your journal will appear here, with gentle insights about how those bonds are evolving.",
     "Your mentions of this person are steady and warm.",
     "Relationship Tracker", "Privately track the people in your journal and how your bonds evolve"),
    ("Pas de préférence",
     "Relations", "Privé — visible uniquement par vous", "Relancer l'analyse", "{count} mentions",
     "Entrées sources", "Retirer du suivi", "Désactiver le suivi des relations",
     "Le suivi des relations est désactivé. Activez-le dans Réglages > Préférences IA.",
     "Aucune relation suivie pour l'instant",
     "Les personnes que vous mentionnez 3 fois ou plus dans votre journal apparaîtront ici, avec des observations douces sur l'évolution de ces liens.",
     "Vos mentions de cette personne sont stables et chaleureuses.",
     "Suivi des relations", "Suivre en privé les personnes de votre journal et l'évolution de vos liens"),
    ("Sin preferencia",
     "Relaciones", "Privado — solo visible para ti", "Escanear de nuevo", "{count} menciones",
     "Entradas de origen", "Eliminar del seguimiento", "Desactivar el seguimiento de relaciones",
     "El seguimiento de relaciones está desactivado. Actívalo en Ajustes > Preferencias de IA.",
     "Aún no hay relaciones seguidas",
     "Las personas que mencionas 3+ veces en tu diario aparecerán aquí, con observaciones suaves sobre cómo evolucionan esos vínculos.",
     "Tus menciones de esta persona son constantes y cálidas.",
     "Seguimiento de relaciones", "Sigue en privado a las personas de tu diario y cómo evolucionan tus vínculos"),
    ("بدون تفضيل",
     "العلاقات", "خاص — مرئي لك فقط", "إعادة الفحص", "{count} إشارات",
     "المدخلات المصدرية", "حذف من التتبع", "إيقاف تتبع العلاقات",
     "تتبع العلاقات معطل. فعّله في الإعدادات > تفضيلات الذكاء الاصطناعي.",
     "لا توجد علاقات متتبعة بعد",
     "سيظهر هنا الأشخاص الذين تذكرهم 3 مرات أو أكثر في دفترك، مع ملاحظات لطيفة حول كيفية تطور هذه الروابط.",
     "إشاراتك إلى هذا الشخص ثابتة ودافئة.",
     "تتبع العلاقات", "تتبع الأشخاص في دفترك وخصوصًا تطور روابطك"),
    ("无偏好",
     "关系", "私密 — 仅你可见", "重新扫描", "{count} 次提及",
     "来源日记", "从跟踪中删除", "关闭关系跟踪",
     "关系跟踪已关闭。请在设置 > AI 偏好中启用。",
     "尚未跟踪任何关系",
     "你在日记中提到3次以上的人会出现在这里，并附上关于这些关系如何演变的温和洞察。",
     "你对这个人的提及稳定而温暖。",
     "关系跟踪", "私密跟踪你日记中的人物及关系演变"),
    ("特になし",
     "人間関係", "プライベート — あなただけに表示", "再スキャン", "{count}回の言及",
     "元のエントリー", "追跡から削除", "人間関係トラッキングをオフにする",
     "人間関係トラッキングはオフです。設定 > AI設定で有効にしてください。",
     "まだ追跡中の関係はありません",
     "日記で3回以上言及した人がここに表示され、その絆の変化について優しい気づきが示されます。",
     "この人への言及は安定していて温かいです。",
     "人間関係トラッカー", "日記に登場する人々と絆の変化をプライベートに追跡します"),
    ("Bila upendeleo",
     "Mahusiano", "Faragha — unaona wewe pekee", "Changanua tena", "Mataja {count}",
     "Maingizo chanzo", "Futa kutoka kufuatilia", "Zima Ufuatiliaji wa Mahusiano",
     "Ufuatiliaji wa mahusiano umezimwa. Washa katika Mipangilio > Mapendeleo ya AI.",
     "Hakuna mahusiano yanayofuatiliwa bado",
     "Watu unaowataja mara 3+ kwenye jarida lako wataonekana hapa, pamoja na ufahamu wa upole kuhusu jinsi mahusiano hayo yanavyobadilika.",
     "Mataja yako kuhusu mtu huyu ni thabiti na ya joto.",
     "Kifuatiliaji cha Mahusiano", "Fuatilia kwa faragha watu katika jarida lako na jinsi mahusiano yanavyobadilika"),
    ("Keine Präferenz",
     "Beziehungen", "Privat — nur für dich sichtbar", "Erneut scannen", "{count} Erwähnungen",
     "Quell-Einträge", "Aus der Verfolgung entfernen", "Beziehungs-Tracking deaktivieren",
     "Beziehungs-Tracking ist deaktiviert. Aktiviere es unter Einstellungen > KI-Einstellungen.",
     "Noch keine verfolgten Beziehungen",
     "Personen, die du 3+ Mal in deinem Journal erwähnst, erscheinen hier — mit sanften Beobachtungen, wie sich diese Bande entwickeln.",
     "Deine Erwähnungen dieser Person sind beständig und warm.",
     "Beziehungs-Tracker", "Verfolge privat die Menschen in deinem Journal und wie sich eure Bande entwickeln"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, title, private, refresh, mentions, sources, delete, disable, disabled, emptyTitle, empty, noInsight, sTitle, sDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Relationship Emotional Tracker\n'
        f'    "relations.title": "{title}",\n'
        f'    "relations.private": "{private}",\n'
        f'    "relations.refresh": "{refresh}",\n'
        f'    "relations.mentions": "{mentions}",\n'
        f'    "relations.sources": "{sources}",\n'
        f'    "relations.delete": "{delete}",\n'
        f'    "relations.disable": "{disable}",\n'
        f'    "relations.disabled": "{disabled}",\n'
        f'    "relations.emptyTitle": "{emptyTitle}",\n'
        f'    "relations.empty": "{empty}",\n'
        f'    "relations.noInsight": "{noInsight}",\n'
        f'    "settings.relationsTracker": "{sTitle}",\n'
        f'    "settings.relationsTrackerDesc": "{sDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

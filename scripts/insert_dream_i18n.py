#!/usr/bin/env python3
"""Insert Dream Reflection i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, dreamTag, title, generating, sTitle, sDesc)
BLOCKS = [
    ("No preference",
     "Mark as a dream", "🌙 Dream Reflection", "Reflecting on your dream...",
     "Dream Reflection", "Poetic reflections when you tag an entry as a dream"),
    ("Pas de préférence",
     "Marquer comme un rêve", "🌙 Réflexion sur le rêve", "Réflexion sur votre rêve...",
     "Réflexion sur les rêves", "Réflexions poétiques quand vous marquez une entrée comme rêve"),
    ("Sin preferencia",
     "Marcar como sueño", "🌙 Reflexión del sueño", "Reflexionando sobre tu sueño...",
     "Reflexión de sueños", "Reflexiones poéticas cuando marcas una entrada como sueño"),
    ("بدون تفضيل",
     "وضع علامة كحلم", "🌙 تأمل الحلم", "جاري التأمل في حلمك...",
     "تأمل الأحلام", "تأملات شعرية عند وضع علامة حلم على إدخال"),
    ("无偏好",
     "标记为梦境", "🌙 梦境反思", "正在反思你的梦境...",
     "梦境反思", "当你将日记标记为梦境时，提供诗意反思"),
    ("特になし",
     "夢としてマーク", "🌙 夢の振り返り", "夢を振り返っています...",
     "夢の振り返り", "エントリーを夢としてタグ付けしたときに詩的な振り返りを提供"),
    ("Bila upendeleo",
     "Weka alama kama ndoto", "🌙 Tafakari ya Ndoto", "Inatafakari ndoto yako...",
     "Tafakari ya Ndoto", "Tafakari za kishairi unapoweka alama ya ndoto kwenye ingizo"),
    ("Keine Präferenz",
     "Als Traum markieren", "🌙 Traum-Reflexion", "Nachdenken über deinen Traum...",
     "Traum-Reflexion", "Poetische Reflexionen, wenn du einen Eintrag als Traum markierst"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, tag, title, gen, sTitle, sDesc) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Dream Reflection\n'
        f'    "record.dreamTag": "{tag}",\n'
        f'    "dream.title": "{title}",\n'
        f'    "dream.generating": "{gen}",\n'
        f'    "settings.dreamReflection": "{sTitle}",\n'
        f'    "settings.dreamReflectionDesc": "{sDesc}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

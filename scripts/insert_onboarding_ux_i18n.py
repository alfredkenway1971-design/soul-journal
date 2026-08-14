#!/usr/bin/env python3
"""Insert onboarding analysis-UX i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview, seconds, slow, slowDesc, retry)
BLOCKS = [
    ("No preference",
     "Analyzing... {s}s", "This is taking longer than usual", "Your profile is still being prepared — you can wait or try again.",
     "Retry"),
    ("Pas de préférence",
     "Analyse en cours... {s}s", "Cela prend plus de temps que d'habitude", "Votre profil est toujours en préparation — vous pouvez attendre ou réessayer.",
     "Réessayer"),
    ("Sin preferencia",
     "Analizando... {s}s", "Está tardando más de lo habitual", "Tu perfil aún se está preparando — puedes esperar o intentar de nuevo.",
     "Reintentar"),
    ("بدون تفضيل",
     "جارٍ التحليل... {s}ث", "يستغرق هذا وقتًا أطول من المعتاد", "لا يزال ملفك قيد الإعداد — يمكنك الانتظار أو المحاولة مرة أخرى.",
     "إعادة المحاولة"),
    ("无偏好",
     "分析中... {s}秒", "这比平时花费的时间更长", "你的档案仍在准备中——你可以等待或重试。",
     "重试"),
    ("特になし",
     "分析中... {s}秒", "通常より時間がかかっています", "プロフィールはまだ準備中です — 待つか、もう一度お試しください。",
     "再試行"),
    ("Bila upendeleo",
     "Inachanganua... {s}s", "Inachukua muda mrefu kuliko kawaida", "Wasifu wako bado unatayarishwa — unaweza kusubiri au kujaribu tena.",
     "Jaribu tena"),
    ("Keine Präferenz",
     "Analyse läuft... {s}s", "Das dauert länger als üblich", "Dein Profil wird noch erstellt — du kannst warten oder es erneut versuchen.",
     "Erneut versuchen"),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, seconds, slow, slowDesc, retry) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Onboarding analysis UX\n'
        f'    "onboarding.analyzingSeconds": "{seconds}",\n'
        f'    "onboarding.analyzingSlow": "{slow}",\n'
        f'    "onboarding.analyzingSlowDesc": "{slowDesc}",\n'
        f'    "onboarding.retry": "{retry}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

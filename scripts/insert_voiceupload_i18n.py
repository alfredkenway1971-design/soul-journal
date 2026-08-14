#!/usr/bin/env python3
"""Insert voice-upload i18n keys after each onboarding.worldviewNoPref line in LanguageContext.tsx."""
PATH = "/root/soul-journal/src/contexts/LanguageContext.tsx"

# (worldview value, uploadFile, uploadHint, tooLarge, tooShort, shortWarn)
BLOCKS = [
    ("No preference",
     "Upload Audio File", "MP3, WAV, M4A · max 5MB · 30-120s of clear speech works best",
     "File is too large — maximum 5MB.", "Audio is too short — please use at least 10 seconds.",
     "Short samples can reduce clone quality — 30-120 seconds is ideal."),
    ("Pas de préférence",
     "Importer un fichier audio", "MP3, WAV, M4A · 5 Mo max · 30 à 120 s de parole claire, idéalement",
     "Fichier trop volumineux — 5 Mo maximum.", "Audio trop court — au moins 10 secondes.",
     "Un échantillon court peut réduire la qualité — 30 à 120 s, idéalement."),
    ("Sin preferencia",
     "Subir archivo de audio", "MP3, WAV, M4A · máx. 5MB · lo ideal es 30-120s de voz clara",
     "El archivo es demasiado grande — máximo 5MB.", "El audio es demasiado corto — usa al menos 10 segundos.",
     "Las muestras cortas pueden reducir la calidad del clon — 30-120s es lo ideal."),
    ("بدون تفضيل",
     "رفع ملف صوتي", "MP3، WAV، M4A · الحد الأقصى 5 م.ب · الأفضل 30-120 ثانية من الكلام الواضح",
     "الملف كبير جدًا — الحد الأقصى 5 م.ب.", "الصوت قصير جدًا — استخدم 10 ثوانٍ على الأقل.",
     "العينات القصيرة قد تقلل جودة الاستنساخ — 30-120 ثانية مثالية."),
    ("无偏好",
     "上传音频文件", "MP3、WAV、M4A · 最大5MB · 30-120秒清晰语音效果最佳",
     "文件太大 — 最大5MB。", "音频太短 — 请至少使用10秒。",
     "较短的样本可能降低克隆质量 — 30-120秒为最佳。"),
    ("特になし",
     "音声ファイルをアップロード", "MP3・WAV・M4A · 最大5MB · 30〜120秒のクリアな音声が最適",
     "ファイルが大きすぎます — 最大5MBです。", "音声が短すぎます — 最低10秒以上にしてください。",
     "短いサンプルはクローン品質を下げる場合があります — 30〜120秒が理想的です。"),
    ("Bila upendeleo",
     "Pakia faili ya sauti", "MP3, WAV, M4A · upeo 5MB · sekunde 30-120 za usemi wazi ni bora",
     "Faili ni kubwa mno — upeo ni 5MB.", "Sauti ni fupi mno — tafadhali tumia angalau sekunde 10.",
     "Sampuli fupi zinaweza kupunguza ubora wa clone — sekunde 30-120 ni bora."),
    ("Keine Präferenz",
     "Audiodatei hochladen", "MP3, WAV, M4A · max. 5MB · 30-120 Sekunden klare Sprache sind ideal",
     "Die Datei ist zu groß — maximal 5MB.", "Das Audio ist zu kurz — bitte mindestens 10 Sekunden.",
     "Kurze Proben können die Klon-Qualität verringern — 30-120 Sekunden sind ideal."),
]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

inserted = 0
for (wv, f1, f2, f3, f4, f5) in BLOCKS:
    anchor = f'    "onboarding.worldviewNoPref": "{wv}",\n'
    if anchor not in content:
        print(f"ANCHOR NOT FOUND: {wv}")
        continue
    block = (
        f'    // Voice clone upload\n'
        f'    "voice.uploadFile": "{f1}",\n'
        f'    "voice.uploadHint": "{f2}",\n'
        f'    "voice.uploadTooLarge": "{f3}",\n'
        f'    "voice.uploadTooShort": "{f4}",\n'
        f'    "voice.uploadShortWarn": "{f5}",\n'
    )
    content = content.replace(anchor, anchor + block, 1)
    inserted += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Inserted: {inserted}/8")

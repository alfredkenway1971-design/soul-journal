#!/usr/bin/env python3
"""Add the 3 remaining keys referenced by new t() calls: common.ai, voiceInput.record, bookBuilder.previewBefore."""
LANGS = ["en", "fr", "es", "ar", "zh", "ja", "sw", "de"]

NEW = {
    "en": {"common.ai": "AI", "voiceInput.record": "Record voice", "bookBuilder.previewBefore": "Preview before generating"},
    "fr": {"common.ai": "IA", "voiceInput.record": "Enregistrer la voix", "bookBuilder.previewBefore": "Aperçu avant génération"},
    "es": {"common.ai": "IA", "voiceInput.record": "Grabar voz", "bookBuilder.previewBefore": "Vista previa antes de generar"},
    "ar": {"common.ai": "الذكاء الاصطناعي", "voiceInput.record": "تسجيل الصوت", "bookBuilder.previewBefore": "معاينة قبل الإنشاء"},
    "zh": {"common.ai": "AI", "voiceInput.record": "录制语音", "bookBuilder.previewBefore": "生成前预览"},
    "ja": {"common.ai": "AI", "voiceInput.record": "音声を録音", "bookBuilder.previewBefore": "生成前のプレビュー"},
    "sw": {"common.ai": "AI", "voiceInput.record": "Rekodi sauti", "bookBuilder.previewBefore": "Hakiki kabla ya kutengeneza"},
    "de": {"common.ai": "KI", "voiceInput.record": "Sprache aufnehmen", "bookBuilder.previewBefore": "Vorschau vor dem Generieren"},
}

path = "src/contexts/extraTranslations.ts"
with open(path) as f:
    content = f.read()

for lang in LANGS:
    keys = NEW[lang]
    marker = f"  {lang}: {{"
    idx = content.index(marker)
    close_idx = content.index("  },", idx)
    block = content[idx:close_idx]
    add = []
    for k, v in keys.items():
        if f'"{k}"' not in block:
            add.append(f'    "{k}": "{v}",')
    if add:
        insert_text = "\n" + "\n".join(add)
        new_block = block.rstrip() + insert_text + "\n"
        content = content[:idx] + new_block + content[close_idx:]

with open(path, "w") as f:
    f.write(content)
print("Added 3 keys across 8 languages")

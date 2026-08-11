#!/usr/bin/env python3
"""Idempotent i18n pass: add remaining keys + replace hardcoded strings with t() in rendered components."""
import re, sys

LANGS = ["en", "fr", "es", "ar", "zh", "ja", "sw", "de"]

EXTRA_KEYS = {
    "en": {
        "fonts.medium": "Medium",
        "weekly.mood.happy": "Happy",
        "weekly.mood.good": "Good",
        "weekly.mood.fine": "Neutral",
        "weekly.mood.sad": "Sad",
        "weekly.mood.unhappy": "Unhappy",
        "admin.dashboard": "Admin Dashboard",
        "admin.grantAccess": "Grant Access",
        "admin.granting": "Granting...",
        "admin.grantDesc": "Enter the email of a registered user to give them full app access without payment.",
        "admin.revenueNote": "Revenue metrics will populate once Stripe is connected and subscriptions are active.",
        "bookBuilder.step1": "Date Range",
        "bookBuilder.step2": "Cover & Title",
        "bookBuilder.step3": "Font & Layout",
        "bookBuilder.step4": "Preview & Generate",
        "pageStyle.blank": "Blank",
        "pageStyle.lined": "Lined",
        "pageStyle.dotted": "Dotted",
        "cover.nebula": "The Nebula",
        "cover.nebulaDesc": "High-contrast lavender & pink gradients",
        "cover.minimalist": "The Minimalist",
        "cover.minimalistDesc": "Clean white with gold foil text",
        "cover.botanical": "The Botanical",
        "cover.botanicalDesc": "Soft floral line art",
        "cover.midnight": "The Midnight",
        "cover.midnightDesc": "Deep indigo with starfield accents",
        "cover.sunrise": "The Sunrise",
        "cover.sunriseDesc": "Warm amber to coral gradient",
        "entry.untitled": "Untitled Entry",
    },
    "fr": {
        "fonts.medium": "Moyen",
        "weekly.mood.happy": "Heureux",
        "weekly.mood.good": "Bien",
        "weekly.mood.fine": "Neutre",
        "weekly.mood.sad": "Triste",
        "weekly.mood.unhappy": "Malheureux",
        "admin.dashboard": "Tableau de bord admin",
        "admin.grantAccess": "Accorder l'accès",
        "admin.granting": "Octroi...",
        "admin.grantDesc": "Saisissez l'e-mail d'un utilisateur enregistré pour lui donner un accès complet sans paiement.",
        "admin.revenueNote": "Les métriques de revenus apparaîtront une fois Stripe connecté et les abonnements actifs.",
        "bookBuilder.step1": "Période",
        "bookBuilder.step2": "Couverture et titre",
        "bookBuilder.step3": "Police et mise en page",
        "bookBuilder.step4": "Aperçu et génération",
        "pageStyle.blank": "Vierge",
        "pageStyle.lined": "Ligné",
        "pageStyle.dotted": "Pointillé",
        "cover.nebula": "La Nébuleuse",
        "cover.nebulaDesc": "Dégradés lavande et rose contrastés",
        "cover.minimalist": "Le Minimaliste",
        "cover.minimalistDesc": "Blanc épuré avec texte doré",
        "cover.botanical": "Le Botanique",
        "cover.botanicalDesc": "Illustration florale délicate",
        "cover.midnight": "Le Minuit",
        "cover.midnightDesc": "Indigo profond avec étoiles",
        "cover.sunrise": "Le Lever de soleil",
        "cover.sunriseDesc": "Dégradé ambre à corail",
        "entry.untitled": "Entrée sans titre",
    },
    "es": {
        "fonts.medium": "Mediano",
        "weekly.mood.happy": "Feliz",
        "weekly.mood.good": "Bien",
        "weekly.mood.fine": "Neutral",
        "weekly.mood.sad": "Triste",
        "weekly.mood.unhappy": "Infeliz",
        "admin.dashboard": "Panel de administración",
        "admin.grantAccess": "Otorgar acceso",
        "admin.granting": "Otorgando...",
        "admin.grantDesc": "Ingresa el correo de un usuario registrado para darle acceso completo sin pago.",
        "admin.revenueNote": "Las métricas de ingresos aparecerán cuando Stripe esté conectado y haya suscripciones activas.",
        "bookBuilder.step1": "Rango de fechas",
        "bookBuilder.step2": "Portada y título",
        "bookBuilder.step3": "Fuente y diseño",
        "bookBuilder.step4": "Vista previa y generar",
        "pageStyle.blank": "En blanco",
        "pageStyle.lined": "Rayado",
        "pageStyle.dotted": "Punteado",
        "cover.nebula": "La Nebulosa",
        "cover.nebulaDesc": "Degradados lavanda y rosa de alto contraste",
        "cover.minimalist": "El Minimalista",
        "cover.minimalistDesc": "Blanco limpio con texto dorado",
        "cover.botanical": "El Botánico",
        "cover.botanicalDesc": "Arte floral suave",
        "cover.midnight": "La Medianoche",
        "cover.midnightDesc": "Índigo profundo con estrellas",
        "cover.sunrise": "El Amanecer",
        "cover.sunriseDesc": "Degradado ámbar a coral",
        "entry.untitled": "Entrada sin título",
    },
    "ar": {
        "fonts.medium": "متوسط",
        "weekly.mood.happy": "سعيد",
        "weekly.mood.good": "جيد",
        "weekly.mood.fine": "محايد",
        "weekly.mood.sad": "حزين",
        "weekly.mood.unhappy": "غير سعيد",
        "admin.dashboard": "لوحة التحكم",
        "admin.grantAccess": "منح الوصول",
        "admin.granting": "جارٍ المنح...",
        "admin.grantDesc": "أدخل بريد مستخدم مسجل لمنحه وصولاً كاملاً دون دفع.",
        "admin.revenueNote": "ستظهر مقاييس الإيرادات بعد ربط Stripe وتفعيل الاشتراكات.",
        "bookBuilder.step1": "نطاق التاريخ",
        "bookBuilder.step2": "الغلاف والعنوان",
        "bookBuilder.step3": "الخط والتخطيط",
        "bookBuilder.step4": "المعاينة والإنشاء",
        "pageStyle.blank": "فارغ",
        "pageStyle.lined": "مسطر",
        "pageStyle.dotted": "منقط",
        "cover.nebula": "السديم",
        "cover.nebulaDesc": "تدرجات خزامى ووردية عالية التباين",
        "cover.minimalist": "البسيط",
        "cover.minimalistDesc": "أبيض نقي مع نص ذهبي",
        "cover.botanical": "النباتي",
        "cover.botanicalDesc": "رسوم زهرية ناعمة",
        "cover.midnight": "منتصف الليل",
        "cover.midnightDesc": "نيلي عميق مع نجوم",
        "cover.sunrise": "الشروق",
        "cover.sunriseDesc": "تدرج كهرماني إلى مرجاني",
        "entry.untitled": "مدخل بدون عنوان",
    },
    "zh": {
        "fonts.medium": "中",
        "weekly.mood.happy": "开心",
        "weekly.mood.good": "不错",
        "weekly.mood.fine": "平静",
        "weekly.mood.sad": "难过",
        "weekly.mood.unhappy": "不开心",
        "admin.dashboard": "管理面板",
        "admin.grantAccess": "授予访问权限",
        "admin.granting": "授予中...",
        "admin.grantDesc": "输入注册用户的邮箱，无需付费即可授予完整访问权限。",
        "admin.revenueNote": "连接 Stripe 且有活跃订阅后，收入指标将显示。",
        "bookBuilder.step1": "日期范围",
        "bookBuilder.step2": "封面与标题",
        "bookBuilder.step3": "字体与布局",
        "bookBuilder.step4": "预览与生成",
        "pageStyle.blank": "空白",
        "pageStyle.lined": "横线",
        "pageStyle.dotted": "点状",
        "cover.nebula": "星云",
        "cover.nebulaDesc": "高对比度淡紫与粉色渐变",
        "cover.minimalist": "极简",
        "cover.minimalistDesc": "干净白色配金字",
        "cover.botanical": "植物",
        "cover.botanicalDesc": "柔和花卉线条画",
        "cover.midnight": "午夜",
        "cover.midnightDesc": "深靛蓝配星空",
        "cover.sunrise": "日出",
        "cover.sunriseDesc": "琥珀到珊瑚渐变",
        "entry.untitled": "无标题日记",
    },
    "ja": {
        "fonts.medium": "中",
        "weekly.mood.happy": "嬉しい",
        "weekly.mood.good": "良い",
        "weekly.mood.fine": "普通",
        "weekly.mood.sad": "悲しい",
        "weekly.mood.unhappy": "不機嫌",
        "admin.dashboard": "管理ダッシュボード",
        "admin.grantAccess": "アクセスを付与",
        "admin.granting": "付与中...",
        "admin.grantDesc": "登録済みユーザーのメールを入力して、支払いなしでフルアクセスを付与します。",
        "admin.revenueNote": "Stripe が接続され、サブスクリプションがアクティブになると収益メトリクスが表示されます。",
        "bookBuilder.step1": "日付範囲",
        "bookBuilder.step2": "カバーとタイトル",
        "bookBuilder.step3": "フォントとレイアウト",
        "bookBuilder.step4": "プレビューと生成",
        "pageStyle.blank": "空白",
        "pageStyle.lined": "罫線",
        "pageStyle.dotted": "ドット",
        "cover.nebula": "ネビュラ",
        "cover.nebulaDesc": "高コントラストのラベンダー＆ピンクのグラデーション",
        "cover.minimalist": "ミニマリスト",
        "cover.minimalistDesc": "ゴールド文字のクリーンな白",
        "cover.botanical": "ボタニカル",
        "cover.botanicalDesc": "柔らかな花のラインアート",
        "cover.midnight": "ミッドナイト",
        "cover.midnightDesc": "星空アクセントの深いインディゴ",
        "cover.sunrise": "サンライズ",
        "cover.sunriseDesc": "アンバーからコーラルのグラデーション",
        "entry.untitled": "無題のエントリー",
    },
    "sw": {
        "fonts.medium": "Wastani",
        "weekly.mood.happy": "Furaha",
        "weekly.mood.good": "Nzuri",
        "weekly.mood.fine": "Upande wowote",
        "weekly.mood.sad": "Huzuni",
        "weekly.mood.unhappy": "Kutofurahi",
        "admin.dashboard": "Dashibodi ya Usimamizi",
        "admin.grantAccess": "Toa ufikiaji",
        "admin.granting": "Inatoa...",
        "admin.grantDesc": "Weka barua pepe ya mtumiaji aliyesajiliwa ili kumpa ufikiaji kamili bila malipo.",
        "admin.revenueNote": "Vipimo vya mapato vitaonekana baada ya Stripe kuunganishwa na usajili kuanza.",
        "bookBuilder.step1": "Muda wa tarehe",
        "bookBuilder.step2": "Jalada na kichwa",
        "bookBuilder.step3": "Fonti na mpangilio",
        "bookBuilder.step4": "Hakiki na tengeneza",
        "pageStyle.blank": "Tupu",
        "pageStyle.lined": "Mistari",
        "pageStyle.dotted": "Madoadoa",
        "cover.nebula": "Nebula",
        "cover.nebulaDesc": "Mchanganyiko wa lavenda na waridi",
        "cover.minimalist": "Minimalist",
        "cover.minimalistDesc": "Nyeupe safi na maandishi ya dhahabu",
        "cover.botanical": "Botanical",
        "cover.botanicalDesc": "Mchoro laini wa maua",
        "cover.midnight": "Usiku wa manane",
        "cover.midnightDesc": "Indigo yenye nyota",
        "cover.sunrise": "Macheo",
        "cover.sunriseDesc": "Mchanganyiko wa amber hadi matumbawe",
        "entry.untitled": "Ingizo lisilo na kichwa",
    },
    "de": {
        "fonts.medium": "Mittel",
        "weekly.mood.happy": "Glücklich",
        "weekly.mood.good": "Gut",
        "weekly.mood.fine": "Neutral",
        "weekly.mood.sad": "Traurig",
        "weekly.mood.unhappy": "Unglücklich",
        "admin.dashboard": "Admin-Dashboard",
        "admin.grantAccess": "Zugriff gewähren",
        "admin.granting": "Wird gewährt...",
        "admin.grantDesc": "Gib die E-Mail eines registrierten Benutzers ein, um vollen Zugriff ohne Zahlung zu gewähren.",
        "admin.revenueNote": "Umsatzkennzahlen erscheinen, sobald Stripe verbunden und Abos aktiv sind.",
        "bookBuilder.step1": "Datumsbereich",
        "bookBuilder.step2": "Cover & Titel",
        "bookBuilder.step3": "Schrift & Layout",
        "bookBuilder.step4": "Vorschau & Generieren",
        "pageStyle.blank": "Leer",
        "pageStyle.lined": "Liniert",
        "pageStyle.dotted": "Gepunktet",
        "cover.nebula": "Der Nebel",
        "cover.nebulaDesc": "Kontrastreiche Lavendel- und Rosé-Verläufe",
        "cover.minimalist": "Der Minimalist",
        "cover.minimalistDesc": "Sauberes Weiß mit Goldtext",
        "cover.botanical": "Der Botanische",
        "cover.botanicalDesc": "Zarte florale Linienkunst",
        "cover.midnight": "Der Mitternacht",
        "cover.midnightDesc": "Tiefes Indigo mit Sterneneffekt",
        "cover.sunrise": "Der Sonnenaufgang",
        "cover.sunriseDesc": "Warmer Amber-zu-Koralle-Verlauf",
        "entry.untitled": "Unbenannter Eintrag",
    },
}

def insert_keys(path):
    with open(path) as f:
        content = f.read()
    for lang in LANGS:
        keys = EXTRA_KEYS[lang]
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
    print("extra keys inserted")

insert_keys("src/contexts/extraTranslations.ts")

# ---------------- FILE REPLACEMENTS ----------------

def replace_in(path, pairs):
    with open(path) as f:
        c = f.read()
    for old, new in pairs:
        if old in c:
            c = c.replace(old, new)
        else:
            print(f"  !! NOT FOUND in {path}: {old[:60]}")
    with open(path, "w") as f:
        f.write(c)
    print(f"updated {path}")

def add_import(path, import_line, after_marker):
    with open(path) as f:
        c = f.read()
    if import_line in c:
        return
    idx = c.index(after_marker)
    end = c.index("\n", idx) + 1
    c = c[:end] + import_line + "\n" + c[end:]
    with open(path, "w") as f:
        f.write(c)
    print(f"import added to {path}")

# ---- 1. HomePage (already has t) ----
replace_in("src/pages/HomePage.tsx", [
    (">Your Journey So Far<", ">{t(\"home.journey\")}<"),
    (">Day Streak<", ">{t(\"home.dayStreak\")}<"),
    (">Total Entries<", ">{t(\"home.totalEntries\")}<"),
    ('? "📖" : entries.length >= 5 ? "🎯" : entries.length >= 3 ? "✨" : "🌱"', '? "📖" : entries.length >= 5 ? "🎯" : entries.length >= 3 ? "✨" : "🌱"'),
    ('{entries.length >= 10 ? "Book Builder" : entries.length >= 5 ? "Coaching" : entries.length >= 3 ? "AI Insights" : "Getting Started"}',
     '{entries.length >= 10 ? t("home.bookBuilder") : entries.length >= 5 ? t("home.coaching") : entries.length >= 3 ? t("home.aiInsights") : t("home.gettingStarted")}'),
    ("{entries.length < 3 ? `✨ ${3 - entries.length} more entries to unlock AI Insights` :\n               entries.length < 5 ? `✨ ${5 - entries.length} more entries to unlock Coaching` :\n               entries.length < 10 ? `✨ ${10 - entries.length} more entries to unlock Book Builder` :\n               \"🎉 All features unlocked!\"}",
     "{entries.length < 3 ? `✨ ${3 - entries.length} ${t(\"home.unlockAIInsights\")}` :\n               entries.length < 5 ? `✨ ${5 - entries.length} ${t(\"home.unlockCoaching\")}` :\n               entries.length < 10 ? `✨ ${10 - entries.length} ${t(\"home.unlockBookBuilder\")}` :\n               `🎉 ${t(\"home.allUnlocked\")}`}"),
])

# ---- 2. QuickCapture (needs import) ----
add_import("src/components/premium/QuickCapture.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useNavigate } from "react-router-dom";')
replace_in("src/components/premium/QuickCapture.tsx", [
    ("const QuickCapture = () => {\n  const navigate = useNavigate();",
     "const QuickCapture = () => {\n  const { t } = useLanguage();\n  const navigate = useNavigate();"),
    (">Quick Capture<", ">{t(\"quickCapture.title\")}<"),
    (">Voice Note<", ">{t(\"quickCapture.voiceNote\")}<"),
    (">Tap to record your thoughts<", ">{t(\"quickCapture.tapToRecord\")}<"),
])

# ---- 3. OnThisDayCard (needs import) ----
add_import("src/components/OnThisDayCard.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "from \"react-router-dom\"")
# find component start
with open("src/components/OnThisDayCard.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const OnThisDayCard = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/components/OnThisDayCard.tsx", "w") as f:
        f.write(c)
    print("hook added OnThisDayCard")
replace_in("src/components/OnThisDayCard.tsx", [
    (">On This Day<", ">{t(\"onThisDay.title\")}<"),
])

# ---- 4. WeeklyMoodSummary (has useLanguage(language), add t) ----
with open("src/components/premium/WeeklyMoodSummary.tsx") as f:
    c = f.read()
if "const { language } = useLanguage();" in c:
    c = c.replace("const { language } = useLanguage();", "const { language, t } = useLanguage();")
    with open("src/components/premium/WeeklyMoodSummary.tsx", "w") as f:
        f.write(c)
    print("t added to WeeklyMoodSummary")
replace_in("src/components/premium/WeeklyMoodSummary.tsx", [
    (">Start journaling to see your weekly mood summary<", ">{t(\"weekly.startJournaling\")}<"),
    (">Weekly Mood Report<", ">{t(\"weekly.report\")}<"),
    (">Last 7 days<", ">{t(\"weekly.last7Days\")}<"),
    (">Most felt mood<", ">{t(\"weekly.mostFelt\")}<"),
    (">Mood Distribution<", ">{t(\"weekly.distribution\")}<"),
    (">Insight<", ">{t(\"weekly.insight\")}<"),
    (">entries<", ">{t(\"calendar.entries\")}<"),
    ("moodLabels[summary.dominantMood] : \"N/A\"", "t(\"weekly.mood.\" + summary.dominantMood) : \"N/A\""),
])

# ---- 5. VoiceInputField (needs import) ----
add_import("src/components/premium/VoiceInputField.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "from \"react-router-dom\"")
with open("src/components/premium/VoiceInputField.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const VoiceInputField = \(\{\n)", c)
    if not m:
        m = re.search(r"(const VoiceInputField = \(\n)", c)
    # find the closing of destructure: ": VoiceInputFieldProps) => {" then insert after
    m2 = re.search(r"(}: VoiceInputFieldProps\) => \{\n)", c)
    c = c[:m2.end()] + "  const { t } = useLanguage();\n" + c[m2.end():]
    with open("src/components/premium/VoiceInputField.tsx", "w") as f:
        f.write(c)
    print("hook added VoiceInputField")
replace_in("src/components/premium/VoiceInputField.tsx", [
    (">AI<", ">{t(\"common.ai\")}<"),
    ('title="Record voice"', 'title={t("voiceInput.record")}'),
])

# ---- 6. GoalsSettingsPage (needs import) ----
add_import("src/pages/GoalsSettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/GoalsSettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const GoalsSettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/GoalsSettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added GoalsSettingsPage")
replace_in("src/pages/GoalsSettingsPage.tsx", [
    (">Personalize your AI coach<", ">{t(\"goals.personalize\")}<"),
    (">Your Goals<", ">{t(\"goals.yourGoals\")}<"),
    (">Your Interests<", ">{t(\"goals.yourInterests\")}<"),
    (">Your Strengths<", ">{t(\"goals.yourStrengths\")}<"),
    (">Your Fears<", ">{t(\"goals.yourFears\")}<"),
    (">Your Worldview<", ">{t(\"goals.yourWorldview\")}<"),
    (">How it works<", ">{t(\"goals.howItWorks\")}<"),
])

# ---- 7. RemindersSettingsPage (needs import) ----
add_import("src/pages/RemindersSettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/RemindersSettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const RemindersSettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/RemindersSettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added RemindersSettingsPage")
replace_in("src/pages/RemindersSettingsPage.tsx", [
    (">Reminders<", ">{t(\"reminders.title\")}<"),
    (">Daily journaling prompts<", ">{t(\"reminders.dailyPrompts\")}<"),
    (">Daily Reminders<", ">{t(\"reminders.daily\")}<"),
    (">Get notified to journal<", ">{t(\"reminders.getNotified\")}<"),
    (">Reminder Time<", ">{t(\"reminders.time\")}<"),
    (">Active Days<", ">{t(\"reminders.activeDays\")}<"),
    (">Contextual reminders<", ">{t(\"reminders.contextual\")}<"),
    (">Personalize messages with your last mood<", ">{t(\"reminders.personalize\")}<"),
])

# ---- 8. SecuritySettingsPage (needs import) ----
add_import("src/pages/SecuritySettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/SecuritySettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const SecuritySettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/SecuritySettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added SecuritySettingsPage")
replace_in("src/pages/SecuritySettingsPage.tsx", [
    (">Security<", ">{t(\"security.title\")}<"),
    (">PIN Lock<", ">{t(\"security.pinLock\")}<"),
    (">Biometric Unlock<", ">{t(\"security.biometric\")}<"),
])

# ---- 9. ThemesSettingsPage (needs import) ----
add_import("src/pages/ThemesSettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/ThemesSettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const ThemesSettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/ThemesSettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added ThemesSettingsPage")
replace_in("src/pages/ThemesSettingsPage.tsx", [
    (">Personalize your journal<", ">{t(\"themes.personalize\")}<"),
    (">Color Theme<", ">{t(\"themes.colorTheme\")}<"),
    (">Background Style<", ">{t(\"themes.background\")}<"),
    (">Coming Soon<", ">{t(\"themes.comingSoon\")}<"),
])

# ---- 10. VoiceSettingsPage (needs import) ----
add_import("src/pages/VoiceSettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/VoiceSettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const VoiceSettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/VoiceSettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added VoiceSettingsPage")
replace_in("src/pages/VoiceSettingsPage.tsx", [
    (">Voice Clone<", ">{t(\"voice.clone\")}<"),
    (">Create your voice clone<", ">{t(\"voice.createClone\")}<"),
    (">Voice Clone Active<", ">{t(\"voice.cloneActive\")}<"),
    (">Recording...<", ">{t(\"record.recording\")}<"),
    (">Recording Preview<", ">{t(\"voice.recordingPreview\")}<"),
    (">Preview before generating<", ">{t(\"voice.previewBefore\")}<"),
])

# ---- 11. BookBuilderPage (needs import) ----
add_import("src/pages/BookBuilderPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/BookBuilderPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const BookBuilderPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/BookBuilderPage.tsx", "w") as f:
        f.write(c)
    print("hook added BookBuilderPage")
# stepInfo module-level labels -> translation keys; render through t()
with open("src/pages/BookBuilderPage.tsx") as f:
    c = f.read()
c = c.replace('{ num: 1, label: "Date Range", icon: Calendar }', '{ num: 1, label: "bookBuilder.step1", icon: Calendar }')
c = c.replace('{ num: 2, label: "Cover & Title", icon: Palette }', '{ num: 2, label: "bookBuilder.step2", icon: Palette }')
c = c.replace('{ num: 3, label: "Font & Layout", icon: Type }', '{ num: 3, label: "bookBuilder.step3", icon: Type }')
c = c.replace('{ num: 4, label: "Preview & Generate", icon: Sparkles }', '{ num: 4, label: "bookBuilder.step4", icon: Sparkles }')
c = c.replace("stepInfo[step - 1].label", "t(stepInfo[step - 1].label)")
c = c.replace("{s.label}", "{t(s.label)}")
c = c.replace("Font Size: <span className=\"text-primary\">{fontSizeLabels[fontSize]}</span>",
              "Font Size: <span className=\"text-primary\">{t(\"fonts.\" + fontSize)}</span>")
with open("src/pages/BookBuilderPage.tsx", "w") as f:
    f.write(c)
print("stepInfo/fontSize labels -> keys")
replace_in("src/pages/BookBuilderPage.tsx", [
    (">Soul Book Builder<", ">{t(\"bookBuilder.title\")}<"),
    (">Select Date Range<", ">{t(\"bookBuilder.selectRange\")}<"),
    (">Choose which entries to include in your book<", ">{t(\"bookBuilder.chooseEntries\")}<"),
    (">From<", ">{t(\"bookBuilder.from\")}<"),
    (">Cover Design<", ">{t(\"bookBuilder.coverDesign\")}<"),
    (">Choose your book's first impression<", ">{t(\"bookBuilder.coverDesc\")}<"),
    (">Voice of the Book<", ">{t(\"bookBuilder.voiceOfBook\")}<"),
    (">Your Soul Book<", ">{t(\"bookBuilder.yourBook\")}<"),
])

# ---- 12. NotFound (needs import) ----
add_import("src/pages/NotFound.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "react-router-dom")
with open("src/pages/NotFound.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const NotFound = \(\) => \{\n)", c)
    if m:
        c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    else:
        m = re.search(r"(function NotFound\(\) \{\n)", c)
        c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/NotFound.tsx", "w") as f:
        f.write(c)
    print("hook added NotFound")
replace_in("src/pages/NotFound.tsx", [
    (">Oops! Page not found<", ">{t(\"notFound.title\")}<"),
])

# ---- 13. ProfileSettingsPage (has t) ----
replace_in("src/pages/ProfileSettingsPage.tsx", [
    ('className="text-2xl font-semibold text-foreground capitalize">Top<',
     'className="text-2xl font-semibold text-foreground capitalize">{t("profile.top")}<'),
])

# ---- 14. AdminDashboard (needs import) ----
add_import("src/pages/AdminDashboard.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useAuth } from "@/contexts/AuthContext";')
with open("src/pages/AdminDashboard.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const AdminDashboard = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/AdminDashboard.tsx", "w") as f:
        f.write(c)
    print("hook added AdminDashboard")
replace_in("src/pages/AdminDashboard.tsx", [
    ('return <Badge variant="outline">Free</Badge>;', 'return <Badge variant="outline">{t("admin.free")}</Badge>;'),
    ('return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Manual Grant</Badge>;',
     'return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{t("admin.manualGrant")}</Badge>;'),
    ('return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;',
     'return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{t("admin.active")}</Badge>;'),
    ('return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Cancelled</Badge>;',
     'return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{t("admin.cancelled")}</Badge>;'),
    ('return <Badge variant="outline">Inactive</Badge>;', 'return <Badge variant="outline">{t("admin.inactive")}</Badge>;'),
    (">Admin Dashboard <", ">{t(\"admin.dashboard\")} <"),
    (">Revenue Metrics<", ">{t(\"admin.revenueMetrics\")}<"),
    (">Total Revenue<", ">{t(\"admin.totalRevenue\")}<"),
    (">This Month<", ">{t(\"admin.thisMonth\")}<"),
    (">Manual Grants<", ">{t(\"admin.manualGrants\")}<"),
    (">Grant Free Access<", ">{t(\"admin.grantFreeAccess\")}<"),
    (">Users with Manual Access<", ">{t(\"admin.usersWithManualAccess\")}<"),
    (">No manual grants yet.<", ">{t(\"admin.noManualGrants\")}<"),
    ('{granting ? "Granting..." : "Grant Access"}', '{granting ? t("admin.granting") : t("admin.grantAccess")}'),
    ("Revenue metrics will populate once Stripe is connected and subscriptions are active.",
     '{t("admin.revenueNote")}'),
])

# ---- 15. CoverTemplates (needs import) ----
add_import("src/components/book-builder/CoverTemplates.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "framer-motion")
with open("src/components/book-builder/CoverTemplates.tsx") as f:
    c = f.read()
# module-level template names -> translation keys
c = c.replace('{ id: "nebula", name: "The Nebula", description: "High-contrast lavender & pink gradients" }',
              '{ id: "nebula", name: "cover.nebula", description: "cover.nebulaDesc" }')
c = c.replace('{ id: "minimalist", name: "The Minimalist", description: "Clean white with gold foil text" }',
              '{ id: "minimalist", name: "cover.minimalist", description: "cover.minimalistDesc" }')
c = c.replace('{ id: "botanical", name: "The Botanical", description: "Soft floral line art" }',
              '{ id: "botanical", name: "cover.botanical", description: "cover.botanicalDesc" }')
c = c.replace('{ id: "midnight", name: "The Midnight", description: "Deep indigo with starfield accents" }',
              '{ id: "midnight", name: "cover.midnight", description: "cover.midnightDesc" }')
c = c.replace('{ id: "sunrise", name: "The Sunrise", description: "Warm amber to coral gradient" }',
              '{ id: "sunrise", name: "cover.sunrise", description: "cover.sunriseDesc" }')
c = c.replace("{t.name}", "{t(t.name)}")
c = c.replace("{t.description}", "{t(t.description)}")
# add hook inside the main exported component that renders templates (CoverTemplates)
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(export const CoverTemplates = \(\{\n)", c)
    if not m:
        m = re.search(r"(const CoverTemplates = \(\{\n)", c)
    if m:
        m2 = re.search(r"(}: CoverTemplatesProps\) => \{\n)", c)
        c = c[:m2.end()] + "  const { t } = useLanguage();\n" + c[m2.end():]
with open("src/components/book-builder/CoverTemplates.tsx", "w") as f:
    f.write(c)
print("CoverTemplates done")
replace_in("src/components/book-builder/CoverTemplates.tsx", [
    (">Soul Avatar on Cover<", ">{t(\"cover.soulAvatar\")}<"),
    (">Display profile picture<", ">{t(\"cover.displayProfile\")}<"),
])

# ---- 16. PageStyleSelector (needs import) ----
add_import("src/components/book-builder/PageStyleSelector.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "framer-motion")
with open("src/components/book-builder/PageStyleSelector.tsx") as f:
    c = f.read()
# module-level bgOptions names -> keys
c = c.replace('name: "Blank",', 'name: "pageStyle.blank",')
c = c.replace('name: "Lined",', 'name: "pageStyle.lined",')
c = c.replace('name: "Dotted",', 'name: "pageStyle.dotted",')
c = c.replace("{opt.name}", "{t(opt.name)}")
if "const { t } = useLanguage();" not in c:
    m2 = re.search(r"(}: PageStyleSelectorProps\) => \{\n)", c)
    c = c[:m2.end()] + "  const { t } = useLanguage();\n" + c[m2.end():]
with open("src/components/book-builder/PageStyleSelector.tsx", "w") as f:
    f.write(c)
print("PageStyleSelector hook")
replace_in("src/components/book-builder/PageStyleSelector.tsx", [
    (">Page Background<", ">{t(\"pageStyle.background\")}<"),
    (">Entry Layout<", ">{t(\"pageStyle.entryLayout\")}<"),
    (">One Per Page<", ">{t(\"pageStyle.onePerPage\")}<"),
    (">Each entry on its own page<", ">{t(\"pageStyle.onePerPageDesc\")}<"),
    (">Continuous<", ">{t(\"pageStyle.continuous\")}<"),
    (">Save paper, flow entries<", ">{t(\"pageStyle.continuousDesc\")}<"),
    (">Magazine<", ">{t(\"pageStyle.magazine\")}<"),
    (">Editorial layout, drop caps<", ">{t(\"pageStyle.magazineDesc\")}<"),
    (">Photo-Forward<", ">{t(\"pageStyle.photoForward\")}<"),
    (">Hero photo, text below<", ">{t(\"pageStyle.photoForwardDesc\")}<"),
    (">Soul Symbol Watermark<", ">{t(\"pageStyle.watermark\")}<"),
    (">Subtle corner emblem on each page<", ">{t(\"pageStyle.watermarkDesc\")}<"),
])

# ---- 17. BookPreview (needs import) ----
add_import("src/components/book-builder/BookPreview.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "framer-motion")
with open("src/components/book-builder/BookPreview.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m2 = re.search(r"(}: BookPreviewProps\) => \{\n)", c)
    c = c[:m2.end()] + "  const { t } = useLanguage();\n" + c[m2.end():]
    with open("src/components/book-builder/BookPreview.tsx", "w") as f:
        f.write(c)
    print("hook added BookPreview")
replace_in("src/components/book-builder/BookPreview.tsx", [
    (">Book Preview<", ">{t(\"preview.title\")}<"),
    (">Cover<", ">{t(\"preview.cover\")}<"),
    (">Entry Page<", ">{t(\"preview.entryPage\")}<"),
    (">Back Cover<", ">{t(\"preview.backCover\")}<"),
    (">Morning Reflection<", ">{t(\"preview.morningReflection\")}<"),
    (">Soul Journal<", ">{t(\"preview.soulJournal\")}<"),
])

# ---- 18. EntryDetailPage fallback title ----
replace_in("src/pages/EntryDetailPage.tsx", [
    ('{entry.title || "Journal Entry"}', '{entry.title || t("entry.untitled")}'),
])

print("ALL DONE")

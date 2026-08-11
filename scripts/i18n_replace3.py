#!/usr/bin/env python3
"""Part 3: Themes + remaining files with corrected import anchors."""
import re

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

# 9. ThemesSettingsPage (no useAuth — anchor on useToast)
add_import("src/pages/ThemesSettingsPage.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           'import { useToast } from "@/hooks/use-toast";')
with open("src/pages/ThemesSettingsPage.tsx") as f:
    c = f.read()
if "const { t } = useLanguage();" not in c:
    m = re.search(r"(const ThemesSettingsPage = \(\) => \{\n)", c)
    c = c[:m.end()] + "  const { t } = useLanguage();\n" + c[m.end():]
    with open("src/pages/ThemesSettingsPage.tsx", "w") as f:
        f.write(c)
    print("hook added ThemesSettingsPage")
replace_in("src/pages/ThemesSettingsPage.tsx", [
    (">Personalize your journal<", '>{t("themes.personalize")}<'),
    (">Color Theme<", '>{t("themes.colorTheme")}<'),
    (">Background Style<", '>{t("themes.background")}<'),
    (">Coming Soon<", '>{t("themes.comingSoon")}<'),
])

# 10. VoiceSettingsPage
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
    (">Voice Clone<", '>{t("voice.clone")}<'),
    (">Create your voice clone<", '>{t("voice.createClone")}<'),
    (">Voice Clone Active<", '>{t("voice.cloneActive")}<'),
    (">Recording...<", '>{t("record.recording")}<'),
    (">Recording Preview<", '>{t("voice.recordingPreview")}<'),
    (">Preview before generating<", '>{t("voice.previewBefore")}<'),
])

# 11. BookBuilderPage
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
with open("src/pages/BookBuilderPage.tsx") as f:
    c = f.read()
c = c.replace('{ num: 1, label: "Date Range", icon: Calendar }', '{ num: 1, label: "bookBuilder.step1", icon: Calendar }')
c = c.replace('{ num: 2, label: "Cover ', '{ num: 2, label: "bookBuilder.step2", icon: Palette }')
c = c.replace('{ num: 3, label: "Font ', '{ num: 3, label: "bookBuilder.step3", icon: Type }')
c = c.replace('{ num: 4, label: "Preview ', '{ num: 4, label: "bookBuilder.step4", icon: Sparkles }')
c = c.replace("stepInfo[step - 1].label", "t(stepInfo[step - 1].label)")
c = c.replace("{s.label}", "{t(s.label)}")
c = c.replace('Font Size: <span className="text-primary">{fontSizeLabels[fontSize]}</span>',
              'Font Size: <span className="text-primary">{t("fonts." + fontSize)}</span>')
with open("src/pages/BookBuilderPage.tsx", "w") as f:
    f.write(c)
print("stepInfo/fontSize labels -> keys")
replace_in("src/pages/BookBuilderPage.tsx", [
    (">Soul Book Builder<", '>{t("bookBuilder.title")}<'),
    (">Select Date Range<", '>{t("bookBuilder.selectRange")}<'),
    (">Choose which entries to include in your book<", '>{t("bookBuilder.chooseEntries")}<'),
    (">From<", '>{t("bookBuilder.from")}<'),
    (">Cover Design<", '>{t("bookBuilder.coverDesign")}<'),
    (">Choose your book", '>{t("bookBuilder.coverDesc")}<'),
    (">Voice of the Book<", '>{t("bookBuilder.voiceOfBook")}<'),
    (">Your Soul Book<", '>{t("bookBuilder.yourBook")}<'),
])

# 12. NotFound
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
    (">Oops! Page not found<", '>{t("notFound.title")}<'),
])

# 13. ProfileSettingsPage
replace_in("src/pages/ProfileSettingsPage.tsx", [
    ('className="text-2xl font-semibold text-foreground capitalize">Top<',
     'className="text-2xl font-semibold text-foreground capitalize">{t("profile.top")}<'),
])

# 14. AdminDashboard
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
    ('>Manual Grant</Badge>;', '>{t("admin.manualGrant")}</Badge>;'),
    ('>Active</Badge>;', '>{t("admin.active")}</Badge>;'),
    ('>Cancelled</Badge>;', '>{t("admin.cancelled")}</Badge>;'),
    ('return <Badge variant="outline">Inactive</Badge>;', 'return <Badge variant="outline">{t("admin.inactive")}</Badge>;'),
    (">Admin Dashboard <", '>{t("admin.dashboard")} <'),
    (">Revenue Metrics<", '>{t("admin.revenueMetrics")}<'),
    (">Total Revenue<", '>{t("admin.totalRevenue")}<'),
    (">This Month<", '>{t("admin.thisMonth")}<'),
    (">Manual Grants<", '>{t("admin.manualGrants")}<'),
    (">Grant Free Access<", '>{t("admin.grantFreeAccess")}<'),
    (">Users with Manual Access<", '>{t("admin.usersWithManualAccess")}<'),
    (">No manual grants yet.<", '>{t("admin.noManualGrants")}<'),
    ('{granting ? "Granting..." : "Grant Access"}', '{granting ? t("admin.granting") : t("admin.grantAccess")}'),
    ("Revenue metrics will populate once Stripe is connected and subscriptions are active.",
     '{t("admin.revenueNote")}'),
])

# 15. CoverTemplates
add_import("src/components/book-builder/CoverTemplates.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "framer-motion")
with open("src/components/book-builder/CoverTemplates.tsx") as f:
    c = f.read()
c = c.replace('name: "The Nebula", description: "High-contrast lavender ', 'name: "cover.nebula", description: "cover.nebulaDesc" }')
c = c.replace('name: "The Minimalist", description: "Clean white with gold foil text"', 'name: "cover.minimalist", description: "cover.minimalistDesc"')
c = c.replace('name: "The Botanical", description: "Soft floral line art"', 'name: "cover.botanical", description: "cover.botanicalDesc"')
c = c.replace('name: "The Midnight", description: "Deep indigo with starfield accents"', 'name: "cover.midnight", description: "cover.midnightDesc"')
c = c.replace('name: "The Sunrise", description: "Warm amber to coral gradient"', 'name: "cover.sunrise", description: "cover.sunriseDesc"')
c = c.replace("{t.name}", "{t(t.name)}")
c = c.replace("{t.description}", "{t(t.description)}")
if "const { t } = useLanguage();" not in c:
    m2 = re.search(r"(}: CoverTemplatesProps\) => \{\n)", c)
    c = c[:m2.end()] + "  const { t } = useLanguage();\n" + c[m2.end():]
with open("src/components/book-builder/CoverTemplates.tsx", "w") as f:
    f.write(c)
print("CoverTemplates done")
replace_in("src/components/book-builder/CoverTemplates.tsx", [
    (">Soul Avatar on Cover<", '>{t("cover.soulAvatar")}<'),
    (">Display profile picture<", '>{t("cover.displayProfile")}<'),
])

# 16. PageStyleSelector
add_import("src/components/book-builder/PageStyleSelector.tsx",
           'import { useLanguage } from "@/contexts/LanguageContext";',
           "framer-motion")
with open("src/components/book-builder/PageStyleSelector.tsx") as f:
    c = f.read()
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
    (">Page Background<", '>{t("pageStyle.background")}<'),
    (">Entry Layout<", '>{t("pageStyle.entryLayout")}<'),
    (">One Per Page<", '>{t("pageStyle.onePerPage")}<'),
    (">Each entry on its own page<", '>{t("pageStyle.onePerPageDesc")}<'),
    (">Continuous<", '>{t("pageStyle.continuous")}<'),
    (">Save paper, flow entries<", '>{t("pageStyle.continuousDesc")}<'),
    (">Magazine<", '>{t("pageStyle.magazine")}<'),
    (">Editorial layout, drop caps<", '>{t("pageStyle.magazineDesc")}<'),
    (">Photo-Forward<", '>{t("pageStyle.photoForward")}<'),
    (">Hero photo, text below<", '>{t("pageStyle.photoForwardDesc")}<'),
    (">Soul Symbol Watermark<", '>{t("pageStyle.watermark")}<'),
    (">Subtle corner emblem on each page<", '>{t("pageStyle.watermarkDesc")}<'),
])

# 17. BookPreview
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
    (">Book Preview<", '>{t("preview.title")}<'),
    (">Cover<", '>{t("preview.cover")}<'),
    (">Entry Page<", '>{t("preview.entryPage")}<'),
    (">Back Cover<", '>{t("preview.backCover")}<'),
    (">Morning Reflection<", '>{t("preview.morningReflection")}<'),
    (">Soul Journal<", '>{t("preview.soulJournal")}<'),
])

# 18. EntryDetailPage
replace_in("src/pages/EntryDetailPage.tsx", [
    ('{entry.title || "Journal Entry"}', '{entry.title || t("entry.untitled")}'),
])

print("ALL DONE")

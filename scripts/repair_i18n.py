#!/usr/bin/env python3
"""Repair corrupted replacements from the bulk i18n pass."""
import re

def fix(path, pairs):
    with open(path) as f:
        c = f.read()
    for old, new in pairs:
        if old in c:
            c = c.replace(old, new)
            print(f"  FIXED {path}: {old[:50]!r}")
        else:
            print(f"  !! STILL NOT FOUND in {path}: {old[:60]!r}")
    with open(path, "w") as f:
        f.write(c)

# ---- 1. BookBuilderPage corrupted stepInfo entries ----
fix("src/pages/BookBuilderPage.tsx", [
    # step 2
    ('{ num: 2, label: "bookBuilder.step2", icon: Palette }& Title", icon: Palette },',
     '{ num: 2, label: "bookBuilder.step2", icon: Palette },'),
    # step 3
    ('{ num: 3, label: "bookBuilder.step3", icon: Type }& Layout", icon: Type },',
     '{ num: 3, label: "bookBuilder.step3", icon: Type },'),
    # step 4
    ('{ num: 4, label: "bookBuilder.step4", icon: Sparkles }& Generate", icon: Sparkles },',
     '{ num: 4, label: "bookBuilder.step4", icon: Sparkles },'),
    # cover description leftover
    ('{t("bookBuilder.coverDesc")}<\'s first impression</p>',
     '{t("bookBuilder.coverDesc")}</p>'),
    # "Preview before generating" -> translated
    ('>Preview before generating<',
     '>{t("bookBuilder.previewBefore")}<'),
])

# ---- 2. CoverTemplates nebula entry corrupted ----
fix("src/components/book-builder/CoverTemplates.tsx", [
    ('name: "cover.nebula", description: "cover.nebulaDesc" }& pink gradients" },',
     'name: "cover.nebula", description: "cover.nebulaDesc" },'),
])

# ---- 3. OnboardingPage: remove hardcoded font-serif so global font applies ----
fix("src/pages/OnboardingPage.tsx", [
    ('className="text-2xl font-bold font-serif text-foreground mb-2 text-center"',
     'className="text-2xl font-bold font-display text-foreground mb-2 text-center"'),
])

print("REPAIRS DONE")

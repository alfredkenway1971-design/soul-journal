#!/usr/bin/env python3
"""Repair the redactor-mangled Authorization line in useJournalAPI.ts (line ~280)."""
path = "/root/soul-journal/src/hooks/useJournalAPI.ts"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

bea = "Bea" + "rer"
authw = "Auth" + "orization"
mid = " \" + (await supabase.auth.getSession()).data.session?.access_token } : {}),"

good = authw + ": \" " + bea + mid
bad = authw + ": *** \" " + mid

count = 0
if bad in c:
    c = c.replace(bad, good)
    count = 1
    print("FIXED")
elif good in c:
    print("OK: already correct")
else:
    print("WARNING: pattern not found")
    for i, line in enumerate(c.splitlines(), 1):
        if "Authorization" in line:
            print(f"  line {i}: {line.strip()[:130]}")

if count:
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

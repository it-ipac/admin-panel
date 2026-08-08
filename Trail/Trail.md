# trail/ — Issue Log

This folder is a running log of non-obvious bugs/incidents in this project: what broke, why, and exactly what was changed to fix it. It's not user docs or architecture notes — those belong elsewhere (`WARP.md`, `docs/`). This is for the "why did this break and how did we fix it" record that git history and code comments don't capture well on their own.

## Naming convention

`<issue>-<developer>-<counter>.md`

- `<issue>`: one word naming the area/feature the issue was in (lowercase, e.g. `login`)
- `<developer>`: whoever investigated/fixed it (lowercase, e.g. `hashir`)
- `<counter>`: that developer's own sequential counter for that issue area, starting at `1` (e.g. `hashir`'s next `login` entry is `login-hashir-2.md`)

Example: `login-hashir-1.md`

## What to put in each file

Keep it short. Four sections:

1. **Goal** — what were you trying to do when you hit the issue
2. **Problem** — what broke, and how it presented (error message, symptom)
3. **Root Cause** — the actual underlying reason, not just the symptom
4. **Fix** / **What Changed** — exact steps/changes made to resolve it

## When to add an entry

- The bug wasn't obvious from the error message alone
- The fix required understanding something undocumented about the stack (e.g. Supabase Auth internals, a schema quirk)
- Future-you or another developer would burn time rediscovering this

Don't log routine bugs with an obvious one-line fix — save this for the ones worth remembering.

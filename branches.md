# Branch & Commit Naming

## Branch Naming

Use lowercase kebab-case.

Format:

`<type>/<short-description>`

Allowed types:
- `feat/` — new feature
- `fix/` — bug fix
- `refactor/` — code cleanup/refactor
- `hotfix/` — urgent production fix
- `docs/` — documentation only

Examples:
- `feat/report-select-all`
- `fix/sidebar-collapse`
- `refactor/report-filters`
- `hotfix/login-error`
- `docs/update-instructions`

Rules:
- Keep branch names short and clear.
- Do not use spaces or underscores.
- Do not work directly on `dev` or `main`.

## Commit Naming

Use short, clear commit messages.

Format:

`<type>: <short description>`

Allowed types:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — refactor
- `docs:` — documentation
- `chore:` — maintenance/config
- `style:` — formatting only

Examples:
- `feat: add select all to reports`
- `fix: correct sidebar collapse behavior`
- `refactor: simplify report filters`
- `docs: add collaboration instructions`

Rules:
- Keep commits focused on one change.
- Use present tense.
- Keep the first line short and descriptive.
- Avoid vague messages such as `update`, `changes`, or `fix stuff`.

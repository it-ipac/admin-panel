# Collaboration Instructions

## Workflow

1. Create and complete all work in a **feature branch**.
2. Merge the feature branch into **`dev`** first.
3. Test and verify the feature on the **`dev` preview environment**:
   - https://ipac-admin-dev.vercel.app/
4. After the feature is finished and tested, open a **pull request from `dev` to `main`** to stage the changes for production.
5. Merge into **`main`** only after verification.

## Production

- `main` is the **production branch**.
- Production URL: https://ipac-admin.vercel.app/
- **Never merge a feature branch directly into `main`.**

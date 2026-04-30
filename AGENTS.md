# Agent Instructions

## Git / Commits

- **Never** add `Co-authored-by` or any co-author trailer to commits under any circumstances..
- Format: `type(scope): #issue kısa açıklama` — Turkish description, lowercase, imperative mood, no trailing period.
- **Allowed types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`, `build`, `style`, `revert`.
- **Scope** must be one of: the name of a directory under `apps/` or `packages/`, or one of the fixed infra scopes (`repo`, `deps`, `docker`, `ci`, `scripts`, `forge`, `docs`, `mail`, `release`).
- Breaking change: add `!` after scope (e.g. `feat(api)!: ...`) and include a `BREAKING CHANGE:` footer.
- Branch names: `type/scope-kebab-case-açıklama` (ASCII only — `ı→i`, `ş→s`, `ğ→g`).
- Local `commit-msg` hook (commitlint) commit mesajlarını, `pre-push` hook'u branch adı konvansiyonunu enforce eder — do not bypass with `--no-verify`. PR başlığı ayrıca CI'da kontrol edilmez; ilk commit mesajından türetilir, o yüzden commit'lerinizi konvansiyona uygun yazın.
- Before writing a commit message, read `docs/CONVENTIONS.md` for the full ruleset and examples.

## Do Not Open Development Servers

- %99 chance that there is already a development server open. Do not try to open it again. Test it with a cURL or another method; if there is no development server still, wait for the user to tell you that they opened the development server.

## Package Manager

- Always use **pnpm** instead of npm/yarn. Use `pnpm install`, `pnpm add`, `pnpm run`, etc.

## TypeScript Type Checking

- Always use **tsgo** (`@typescript/native-preview`) instead of `tsc` for type checking.
- Run: `pnpm exec tsgo --noEmit` (or equivalent) for type checks.

## Linting

- Always use **oxlint** instead of eslint.
- Run: `pnpm exec oxlint` for linting.

## Formatting

- Always use **oxfmt** instead of prettier for code formatting.

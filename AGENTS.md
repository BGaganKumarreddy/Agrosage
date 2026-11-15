# AgroSage — Permanent Project Identity, Workspace Migration and Naming Safety Rules

**Effective immediately. These instructions apply to every future coding task and agent session in this repository.**

---

## 1. Canonical Project Identity

| Property | Canonical Value |
|---|---|
| **Product Name** | AgroSage |
| **Tagline** | Intelligence for Every Acre. |
| **Local Project Folder** | `agrosage` |
| **GitHub Repository** | `BGaganKumarreddy/agrosage` |
| **Canonical Clone URL** | `https://github.com/BGaganKumarreddy/agrosage.git` |
| **Main Branch** | `main` |
| **Project Category** | AI-Powered Agricultural Intelligence Platform |

The legacy product name `RythuSaathi` is **deprecated** for all new public-facing content, documentation, branding, user interface text, and commits.

---

## 2. Mandatory Workspace Verification

Before performing **ANY** operation (inspecting code, editing files, running tests, or staging commits):

1. **Inspect current working directory**: Confirm the current path ends in `agrosage`.
2. **Confirm repository root folder**: Ensure the repository root folder is named `agrosage`.
3. **Execute `git rev-parse --show-toplevel`**: Verify Git identifies the expected repository root.
4. **Execute `git remote -v`**: Confirm that `origin` points to `https://github.com/BGaganKumarreddy/agrosage.git`.
5. **Check current branch**: Verify the active branch and ensure the working tree status is understood.

### Portable Workspace Rules

1. **Workspace Directory**: The repository root directory must be named `agrosage`.
2. **Git Root Match**: `git rev-parse --show-toplevel` must match the current workspace root.
3. **Canonical Remote**: The Git remote `origin` must match `https://github.com/BGaganKumarreddy/agrosage.git`.
4. **Portability Principle**: Never assume a particular Windows username, home directory, user profile path, or OneDrive location. Verification relies strictly on directory structure and Git topology.

### Immediate Stop Condition

If the coding environment, terminal, IDE, or agent session points to the old `rythusaathi` directory:
- **Stop execution immediately.**
- **Do not edit files.**
- **Do not run tests.**
- **Do not stage or commit changes.**
- **Ask for the project to be reopened from the canonical `agrosage` directory.**

*Never work simultaneously from two copies of this repository.*

---

## 3. Naming Policy

For all new development:
- Use **`AgroSage`** in frontend branding, page titles, user-visible text, documentation, and reports.
- Use **`agrosage`** in new project-root directory references, scripts, and workspace configuration.
- Use **`AgroSage`** or a clearly relevant feature name in new commit subjects.
- Use the canonical AgroSage GitHub repository URL (`https://github.com/BGaganKumarreddy/agrosage.git`) in new documentation.

### Prohibited in New Development
Do not introduce the deprecated product name (`RythuSaathi`) into new:
- Documentation.
- Architecture diagrams.
- Feature names.
- Test descriptions.
- README content.
- Screenshots and demo material.
- Commit messages.
- Release notes.
- Configuration examples.

*Historical documents may retain the old name when historically necessary, but must never misrepresent the current product identity.*

---

## 4. Critical Compatibility Exception — Internal Identifiers

The existing Python package namespace:
```text
rythusaathi
```
**MUST remain unchanged for now.**

**Strictly prohibited — Do not globally rename:**
- Python import namespaces (`from rythusaathi...`, `import rythusaathi`).
- Existing internal module paths (`src/rythusaathi/...`).
- Database table names.
- SQLite filenames (`*.sqlite3`).
- Database migration identifiers.
- Existing credential namespaces (e.g. `service: "rythusaathi"`, issuer `rythusaathi:local`).
- Existing historical test fixtures.
- Historical migration records.

These identifiers are actively referenced by existing code, persistent data stores, migration histories, and installed virtual environments. **Do not rename them merely to make every occurrence look consistent.**

### Future Package Migration Protocol
Any future internal package migration must be a separately approved task with:
1. Dependency and import impact analysis.
2. Database compatibility analysis.
3. Migration and rollback strategy.
4. Comprehensive regression tests.
5. Documentation updates.
6. Verified compatibility with existing user data.

---

## 5. Stale Workspace-Path Audit & Classification

When auditing files across the repository, classify every occurrence into one of five categories:

| Class | Category | Action |
|---|---|---|
| **1** | **Defective stale workspace reference** | **Fix immediately** (e.g. outdated clone URLs, dead hardcoded paths, incorrect `cd` instructions). |
| **2** | **Intentional internal Python compatibility identifier** | **Preserve** (e.g. `src/rythusaathi/`, package imports, `pyproject.toml` package name). |
| **3** | **Historical documentation reference** | **Preserve** (e.g. archived phase reports, historical audit logs documenting prior workspace state). |
| **4** | **Persistent database or migration identifier** | **Preserve** (e.g. SQLite filenames, table schemas, auth tokens, database records). |
| **5** | **Harmless example or test fixture** | **Preserve** unless explicitly targeted by a new feature requirement. |

**Do not execute indiscriminate global find-and-replace operations.** Fix only defective references.

---

## 6. Git Safety Rules

Before **every** commit:
1. Confirm repository root is `agrosage`.
2. Confirm the `origin` remote points to `https://github.com/BGaganKumarreddy/agrosage.git`.
3. Confirm the intended branch (`main` or approved feature branch).
4. Inspect `git status`.
5. Inspect the complete diff.
6. Run `git diff --check` to ensure no whitespace or formatting errors.
7. Verify that **no secrets, API keys, `.env` files, credential stores, local databases, logs, or generated artifacts** are staged.
8. Verify that the commit belongs to the correct repository.

**Rules of engagement:**
- Never commit from the old workspace.
- Never create or use a second Git repository inside the project folder.
- Never overwrite user data or rewrite existing Git history to resolve naming inconsistencies.

---

## 7. Persistent Agent Instructions

- **Every future agent session MUST read and follow this `AGENTS.md` before taking action.**
- If other instruction files or developer prompts conflict with `AGENTS.md`, identify the conflict and resolve it explicitly instead of silently choosing one.
- The coding agent must retain the canonical AgroSage identity across new sessions and must never revert to the old product name.

# AgroSage — Permanent Project Identity, Architecture and Naming Safety Rules

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
| **Python Package Namespace** | `agrosage` |
| **Python Package Directory** | `src/agrosage/` |

The project identity is strictly **AgroSage** across all public-facing content, documentation, branding, user interface text, internal Python namespaces, database identifiers, and commits.

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

If the coding environment, terminal, IDE, or agent session points to an invalid or stale directory:
- **Stop execution immediately.**
- **Do not edit files.**
- **Do not run tests.**
- **Do not stage or commit changes.**
- **Ask for the project to be reopened from the canonical `agrosage` directory.**

*Never work simultaneously from two copies of this repository.*

---

## 3. Naming Policy

For all development:
- Use **`AgroSage`** in frontend branding, page titles, user-visible text, documentation, and reports.
- Use **`agrosage`** in project-root directory references, Python imports (`import agrosage`), scripts, and workspace configuration.
- Use **`AgroSage`** or a clearly relevant feature name in commit subjects.
- Use the canonical AgroSage GitHub repository URL (`https://github.com/BGaganKumarreddy/agrosage.git`) in documentation.

### Prohibited in Development
Do not introduce legacy product identifiers into:
- Source code or package imports.
- Documentation.
- Architecture diagrams.
- Feature names.
- Test descriptions.
- README content.
- Screenshots and demo material.
- Commit messages.
- Release notes.
- Configuration examples.

---

## 4. Canonical Architecture and Identifiers

The canonical Python package namespace is:
```text
agrosage
```
Located in:
```text
src/agrosage/
```

**Canonical Identifiers:**
- Python import namespaces: `from agrosage...`, `import agrosage`.
- Internal module paths: `src/agrosage/...`.
- Database filenames: `tmp/agrosage-auth.sqlite3`, `tmp/agrosage-history.sqlite3`, `agrosage.db`.
- Credential namespaces: `service: "agrosage"`, issuer `agrosage:local`.
- Frontend token storage keys: `agrosage_auth_token`, `agrosage_token`, `agrosage_farmer_profile`.

*Note*: External government welfare schemes (such as Telangana's official `Rythu Bharosa` welfare scheme, G.O. Rt. No. 18) are domain knowledge entities and must remain accurately cited per official government records.

---

## 5. Workspace-Path Audit & Classification

When auditing files across the repository, classify every occurrence into one of five categories:

| Class | Category | Action |
|---|---|---|
| **1** | **Defective stale workspace reference** | **Fix immediately** (e.g. outdated clone URLs, dead hardcoded paths, incorrect `cd` instructions). |
| **2** | **Canonical AgroSage Python package identifier** | **Preserve** (`src/agrosage/`, package imports, `pyproject.toml` package name). |
| **3** | **Historical documentation reference** | **Update** to canonical AgroSage documentation standards. |
| **4** | **Persistent database or migration identifier** | **Preserve canonical** (`agrosage-*.sqlite3`, table schemas, auth tokens, database records). |
| **5** | **Test fixtures and assertions** | **Preserve canonical** (`agrosage:local`, AgroSage test assertions). |

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
- Never create or use a second Git repository inside the project folder.
- Never overwrite user data or rewrite existing Git history to resolve naming inconsistencies.

---

## 7. Persistent Agent Instructions

- **Every future agent session MUST read and follow this `AGENTS.md` before taking action.**
- If other instruction files or developer prompts conflict with `AGENTS.md`, identify the conflict and resolve it explicitly instead of silently choosing one.
- The coding agent must retain the canonical AgroSage identity across new sessions and must never revert to old product names.

# Safety Guardrails Overview

How we keep production safe when deploying code.

---

## The Problem We Solved

Before: You push code → It goes straight to production → If it's broken, your app breaks.

After: You push code → Automatic checks run first → Only good code reaches production.

---

## How It Works

```mermaid
flowchart TD
    A[You write code] --> B[You run: git push]
    B --> C{Pre-push checks}
    C -->|Build fails| D[Push blocked]
    C -->|Lint fails| D
    D --> E[You fix the issue]
    E --> B
    C -->|All checks pass| F[Code goes to GitHub]
    F --> G[DigitalOcean sees new code]
    G --> H[DO builds and deploys]
    H --> I[Your app is updated]
```

---

## What Gets Checked Before Every Push

```mermaid
flowchart LR
    subgraph Checks["Automatic Checks"]
        B[Build Test<br/>Can the code compile?]
        L[Lint Test<br/>Is the code clean?]
    end

    subgraph Apps["What We Check"]
        F[Front App]
        A[API]
        C[Common Code]
        D[Data Types]
    end

    subgraph Skip["What We Skip"]
        FD[fdaily-pro<br/>Not in production]
    end
```

---

## What's In Production vs Not

```mermaid
flowchart TB
    subgraph Production["In Production"]
        direction TB
        FR[NextTier Frontend<br/>What users see]
        AP[NextTier API<br/>Backend logic]
        DB[(Database<br/>Your data)]
    end

    subgraph NotProd["NOT in Production"]
        direction TB
        FDP[fdaily-pro<br/>Homeowner Advisor clone]
        FDB[(Separate Database<br/>Separate data)]
    end

    FR <--> AP
    AP <--> DB

    FDP <--> FDB

    Production ~~~ NotProd
```

---

## When Something Goes Wrong

```mermaid
flowchart TD
    A[Something breaks in production] --> B[Open docs/RELEASES.md]
    B --> C[Find the last working version]
    C --> D[Run: git revert bad-commit]
    D --> E[Push the fix]
    E --> F[DigitalOcean redeploys]
    F --> G[App is working again]
```

---

## Your Safety Net

| Protection | What It Does |
|------------|--------------|
| Pre-push hook | Stops broken code before it leaves your computer |
| Release log | Tracks every deploy so you can undo mistakes |
| Env docs | Lists all the settings your app needs to run |

---

## Quick Commands

**Check your code manually (without pushing):**
```bash
pnpm precheck
```

**See what would be deployed:**
```bash
git log --oneline -5
```

**Undo a bad deploy:**
```bash
git revert <bad-commit-sha>
git push
```

---

## Files We Created

| File | Purpose |
|------|---------|
| `.git/hooks/pre-push` | Runs checks before every push |
| `docs/RELEASES.md` | Log of all deploys for rollback |
| `docs/ENVIRONMENTS.md` | List of all settings needed |
| `docs/SAFETY-GUARDRAILS.md` | This overview |

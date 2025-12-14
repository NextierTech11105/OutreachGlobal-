# Release Log

Track deployments here for easy rollback when needed.

## How to Rollback

**If something breaks after a deploy:**

1. Find the last working release below (look at the SHA)
2. Revert the broken commit:
   ```bash
   git revert <broken-sha>
   git push origin main
   ```
3. OR reset to a known good state:
   ```bash
   git reset --hard <good-sha>
   git push origin main --force
   ```
4. DO will auto-redeploy the fixed code

**Before doing a force push**, make sure you know what you're doing - it rewrites history.

---

## Releases

### 2025-12-13

| SHA | Change |
|-----|--------|
| `eef19d7` | security: quarantine secrets and env hardening |
| `d9d8187` | Reorganize admin sidebar - reduce 12 items to 6 groups |
| `0ec14f8` | Add datalake pull and leads table to Data Hub |
| `46db6bc` | Make nav group headers bigger and collapsible (hidden by default) |

### 2025-12-12

| SHA | Change |
|-----|--------|
| `0f20f6f` | Reorganize nav into groups, add table sorting/pagination, fix landline SMS blocking |
| `4ac4ceb` | Block SMS to landlines at API level |
| `7c7e1e5` | Add phone type validation for SMS compliance |
| `617a623` | Clean up leads table: show USBizData fields clearly |
| `2e31416` | Move floating buttons higher (bottom-32) to clear pagination |
| `ed086a3` | Data Hub: Rename Email to Sequences (multi-channel campaigns) |
| `8391d81` | Data Hub: Add Simple/Pro mode toggle (NinjaTrader style) |
| `04c2ac3` | Data Hub: simplified 3-step layout with big buttons |
| `7a69612` | Data Hub: dark theme + simplified UI |
| `f747714` | Add Data Hub page for simplified UX |
| `c9bf4cc` | Add .dockerignore to fix nx cache build issue |

---

## How to Add New Releases

After each deploy, add a new entry:

```markdown
| `<sha>` | <commit message> |
```

Get the SHA with: `git log --oneline -1`

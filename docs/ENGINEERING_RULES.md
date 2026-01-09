# Engineering Rules - OutreachGlobal/Nextier

## Effective Date
From tag: `v1.0.0-baseline` forward (2026-01-09)

---

## ALLOWED

### Code Changes
- Feature branches from `main`
- PRs with passing CI
- Changes within your scope
- Hotfixes with expedited review (1 approval)

### Commit Messages
Use conventional commits:
```
type(scope): description

Types: feat, fix, docs, refactor, test, chore
Scopes: api, front, common, dto, infra, functions
```

### Dependencies
- Adding dev dependencies to your scope
- Updating patch/minor versions
- Adding to packages you own

---

## FORBIDDEN

### Never Do
- Direct commits to `main`
- Force push to `main`
- Merge without CI passing
- Skip required reviews
- Modify outside your scope without approval
- Delete production branches
- Commit secrets/credentials/API keys

### Breaking Changes Without Contract
These require a feature contract first:
- GraphQL schema changes
- DTO schema changes
- Database migrations
- API endpoint changes
- Event payload changes

---

## TRIGGERS ROLLBACK

Automatic rollback if:
- Production error rate > 1%
- API response time > 2s (p95)
- Build failure on `main`
- Critical security vulnerability
- Data integrity issue

### Rollback Procedure
1. Identify last known good commit
2. Create revert PR
3. Expedited review (1 approval)
4. Merge and deploy
5. Post-mortem within 24h

---

## TRIGGERS ESCALATION

Escalate when:
- Cross-scope conflicts
- Contract disagreements
- Security concerns
- Performance regressions

### Escalation Path
1. Agent-to-agent discussion (if AI)
2. Human review
3. Founder decision (final)

---

## DEFINITION OF DONE

A feature is "done" when:
- [ ] Code implemented
- [ ] All CI checks pass
- [ ] PR approved
- [ ] Merged to `main`
- [ ] Deployed (auto via DO App Platform)
- [ ] Verified working

---

## SCOPES

### Backend
- `apps/api/**`
- `packages/dto/**`
- `functions/**`

### Frontend
- `apps/front/**`
- `apps/extension/**`

### Infra
- `.github/**`
- `scripts/**`
- `docs/**`
- Root config files

### Shared (requires 2 approvals)
- `packages/common/**`

---

## VERSION
- Rules version: 1.0.0
- Last updated: 2026-01-09

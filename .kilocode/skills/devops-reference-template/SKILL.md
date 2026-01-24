# DevOps Reference Template

> **Type**: Infrastructure & Operations
> **Status**: Reference Template - Use as model for other DevOps skills

---

## Purpose

This skill manages [SPECIFIC DEVOPS FUNCTION] for the OutreachGlobal platform deployed on DigitalOcean App Platform.

## Current State in Codebase

**Implementation Status**: [EXISTS / PARTIAL / MISSING]

### What Already Exists
- `[path/to/existing/file]` - [description]

### What Needs Building
- [specific gap]

---

## Scope

### In Scope
- [Specific responsibility 1]
- [Specific responsibility 2]

### Out of Scope
- Authentication / Clerk config (handled by auth team)
- Database schema changes (use database-management-engine skill)
- Application code changes

---

## Infrastructure Context

### Platform
- **Hosting**: DigitalOcean App Platform
- **Database**: PostgreSQL (managed)
- **Cache/Queue**: Redis (managed)
- **CDN**: DigitalOcean Spaces / Cloudflare

### Current Architecture
```
┌─────────────────────────────────────────────┐
│           DigitalOcean App Platform         │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ API App │  │ Frontend│  │ Worker App  │ │
│  │ (NestJS)│  │(Next.js)│  │ (BullMQ)    │ │
│  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │            │              │         │
│  ┌────┴────────────┴──────────────┴────┐   │
│  │         Internal Network            │   │
│  └────┬────────────┬──────────────┬────┘   │
│       │            │              │         │
│  ┌────┴────┐  ┌────┴────┐  ┌─────┴─────┐  │
│  │PostgreSQL│  │  Redis  │  │  Spaces   │  │
│  │ (managed)│  │(managed)│  │  (S3)     │  │
│  └─────────┘  └─────────┘  └───────────┘  │
└─────────────────────────────────────────────┘
```

---

## Configuration Files

### DO NOT MODIFY (Protected)
```
.do/                          # DigitalOcean app spec
├── app.yaml                  # DO NOT TOUCH
docker-compose.yml            # DO NOT TOUCH
Dockerfile                    # DO NOT TOUCH
.github/workflows/            # DO NOT TOUCH
.env*                         # DO NOT TOUCH
```

### Safe to Modify (With Approval)
```
# Only infrastructure-as-code in .kilocode/skills/
.kilocode/skills/[skill-name]/
```

---

## Environment Variables

### Required (Already Configured)
| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | DO managed | PostgreSQL connection |
| `REDIS_URL` | DO managed | Redis connection |
| `CLERK_*` | Clerk dashboard | Auth config |
| `SIGNALHOUSE_*` | Team settings | SMS provider |
| `OPENAI_API_KEY` | Team settings | AI provider |

### Adding New Variables
1. Add to DigitalOcean App Platform console
2. Document in this skill
3. Never commit to git

---

## Monitoring & Alerts

### Current Monitoring
- DigitalOcean built-in metrics
- Application logs via DO console
- Sentry for error tracking (if configured)

### Key Metrics to Watch
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | > 70% | > 90% |
| Memory | > 80% | > 95% |
| Response Time | > 500ms | > 2000ms |
| Error Rate | > 1% | > 5% |
| Queue Depth | > 1000 | > 5000 |

---

## Deployment

### Current Process
1. Push to `main` branch
2. DigitalOcean auto-deploys
3. Zero-downtime rolling update

### Rollback
```bash
# Via DigitalOcean console or CLI
doctl apps create-deployment <app-id> --force-rebuild
```

---

## Scaling

### Horizontal Scaling
- Adjust instance count in DO console
- API: 1-3 instances
- Worker: 1-2 instances
- Frontend: 1-2 instances

### Vertical Scaling
- Current: Basic tier (1 vCPU, 512MB-1GB RAM)
- Upgrade via DO console if needed

---

## Disaster Recovery

### Backups
- PostgreSQL: Daily automated backups (DO managed)
- Redis: Point-in-time recovery (DO managed)
- Application: Git history

### Recovery Steps
1. Restore database from DO backup
2. Redeploy application from git
3. Verify environment variables
4. Test critical paths

---

## Security Checklist

- [ ] No secrets in git
- [ ] Environment variables in DO console only
- [ ] HTTPS enforced
- [ ] Database not publicly accessible
- [ ] Redis not publicly accessible
- [ ] API rate limiting enabled
- [ ] CORS configured correctly

---

## Dependencies

### Prerequisite Skills
- None (foundational skill)

### Existing Services Used
- DigitalOcean App Platform
- DigitalOcean Managed PostgreSQL
- DigitalOcean Managed Redis

### External APIs Required
- DigitalOcean API (for automation)

---

## Implementation Patterns

### Logging Pattern
```typescript
// Use structured logging
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doWork(teamId: string) {
    this.logger.log({
      message: 'Starting work',
      teamId,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Health Check Pattern
```typescript
// apps/api/src/app/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  readiness() {
    // Check database, redis, etc.
    return { ready: true };
  }
}
```

---

## Testing

### Infrastructure Tests
- Verify deployments complete
- Health endpoints respond
- Database connections work
- Redis connections work

### Load Testing
- Use k6 or artillery
- Test against staging only
- Never load test production without approval

---

## Runbooks

### High CPU Alert
1. Check DO metrics for spike source
2. Review recent deployments
3. Check for runaway queries
4. Scale horizontally if needed

### Database Connection Issues
1. Check DO database status
2. Verify connection string
3. Check connection pool exhaustion
4. Review slow query logs

### Queue Backup
1. Check Redis memory usage
2. Review failed jobs
3. Scale workers if needed
4. Clear dead letter queue

---

## Multi-Tenant Considerations

All DevOps operations must maintain tenant isolation:
- Logs should include `teamId`
- Metrics should be segmented by team
- No cross-tenant data exposure
- Resource limits per tenant if applicable

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-23 | Initial template |

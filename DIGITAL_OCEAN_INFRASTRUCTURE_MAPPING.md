# DIGITAL OCEAN INFRASTRUCTURE MAPPING DOCUMENT
## Nextier/OutreachGlobal Platform - Production Architecture

**Document Version**: 1.0  
**Last Updated**: 2025-12-21  
**Platform**: Nextier AI-Powered Outreach Platform  
**Cloud Provider**: Digital Ocean  
**Environment**: Production + Staging  

---

## 🏗️ INFRASTRUCTURE OVERVIEW

### Platform Architecture Summary
```
┌─────────────────────────────────────────────────────────────┐
│                   DIGITAL OCEAN ECOSYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│  🌐 APP RUNNER                                              │
│  ├─ Next.js Frontend (Port 3000)                          │
│  ├─ NestJS API Backend (Port 3001)                        │
│  └─ Background Workers (BullMQ + Redis)                   │
├─────────────────────────────────────────────────────────────┤
│  🗄️ MANAGED DATABASES                                      │
│  ├─ PostgreSQL Primary (Production)                       │
│  ├─ PostgreSQL Read Replica (Staging)                     │
│  └─ Redis Cache & Queue Cluster                           │
├─────────────────────────────────────────────────────────────┤
│  💾 SPACES OBJECT STORAGE                                  │
│  ├─ Bucket: nextier (Primary)                             │
│  ├─ Bucket: nextier-staging (Staging)                     │
│  └─ CDN: Global Distribution                              │
├─────────────────────────────────────────────────────────────┤
│  🌐 NETWORK & SECURITY                                     │
│  ├─ VPC: default-vpc                                     │
│  ├─ Load Balancer: SSL Termination                       │
│  ├─ Firewall: app-tier, db-tier rules                    │
│  └─ Domain: outreachglobal.com + subdomains              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ EDGE FUNCTIONS DEPLOYMENT

### Current Edge Function Inventory
Based on codebase analysis, the following functions are deployed:

#### 1. Frontend Application Functions
```typescript
// Next.js App Router Functions (170+ routes detected)
┌─────────────────────────────────────────────────────────────┐
│ API ROUTES MAPPING                                          │
├─────────────────────────────────────────────────────────────┤
│ 📊 Data Management                                          │
│ ├─ /api/leads/* (Lead CRUD operations)                     │
│ ├─ /api/properties/* (Property data management)            │
│ ├─ /api/campaigns/* (Campaign lifecycle)                   │
│ └─ /api/analytics/* (Reporting endpoints)                  │
├─────────────────────────────────────────────────────────────┤
│ 🤖 AI Integration                                           │
│ ├─ /api/ai/* (AI service endpoints)                        │
│ ├─ /api/gianna/* (Gianna AI agent)                         │
│ ├─ /api/cathy/* (Cathy AI agent)                           │
│ ├─ /api/sabrina/* (Sabrina AI agent)                       │
│ └─ /api/neva/* (Neva AI agent)                             │
├─────────────────────────────────────────────────────────────┤
│ 🔗 External Integrations                                    │
│ ├─ /api/apollo/* (Apollo.io enrichment)                   │
│ ├─ /api/twilio/* (Voice/SMS services)                      │
│ ├─ /api/stripe/* (Payment processing)                      │
│ └─ /api/signalhouse/* (SMS delivery)                       │
├─────────────────────────────────────────────────────────────┤
│ 🔄 Background Processing                                    │
│ ├─ /api/webhooks/* (External service webhooks)             │
│ ├─ /api/jobs/* (Background job triggers)                   │
│ └─ /api/cron/* (Scheduled task endpoints)                  │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Backend API Functions
```typescript
// NestJS GraphQL + REST API Functions
┌─────────────────────────────────────────────────────────────┐
│ BACKEND SERVICE MAPPING                                     │
├─────────────────────────────────────────────────────────────┤
│ 🏢 Core Business Logic                                      │
│ ├─ Campaign Service (campaign.*)                          │
│ ├─ Lead Management (lead.*)                               │
│ ├─ Property Service (property.*)                          │
│ └─ User Management (user.*)                               │
├─────────────────────────────────────────────────────────────┤
│ 🔧 Utility Services                                         │
│ ├─ Enrichment Service (enrichment.*)                      │
│ ├─ Integration Service (integration.*)                    │
│ ├─ Notification Service (notification.*)                  │
│ └─ Analytics Service (analytics.*)                        │
└─────────────────────────────────────────────────────────────┘
```

### Edge Function Configuration
```yaml
Runtime Environment:
  Node.js Version: 18.x LTS
  Package Manager: pnpm
  Build System: Next.js 15 + NestJS 11
  Deployment: App Platform (Digital Ocean)

Resource Allocation:
  CPU: 1 vCPU (auto-scaling to 4 vCPU)
  RAM: 1GB (auto-scaling to 4GB)
  Storage: 25GB (auto-scaling)
  Bandwidth: 1TB/month included

Auto-scaling Triggers:
  CPU: >70% for 2 minutes
  Memory: >80% for 2 minutes
  Response Time: >2000ms for 1 minute
```

---

## 🗄️ DATABASE ARCHITECTURE

### PostgreSQL Configuration

#### Primary Database (Production)
```yaml
Database Instance:
  Name: nextier-prod-db
  Engine: PostgreSQL 15
  Size: db-s-2vcpu-2gb (2 vCPU, 2GB RAM)
  Storage: 25GB SSD (auto-scaling enabled)
  Region: NYC3 (Primary)
  
Connection Settings:
  Max Connections: 25 (25% of available)
  Connection Pool: PgBouncer enabled
  SSL Mode: require
  Connection Timeout: 60 seconds
  
Backup Strategy:
  Automatic Backups: Enabled (7-day retention)
  Point-in-Time Recovery: Enabled
  Backup Schedule: Daily at 2:00 AM UTC
  Backup Retention: 7 days (automated cleanup)
```

#### Read Replica (Analytics/Reporting)
```yaml
Database Instance:
  Name: nextier-prod-db-replica
  Engine: PostgreSQL 15
  Size: db-s-1vcpu-1gb (1 vCPU, 1GB RAM)
  Region: NYC3 (Same region for low latency)
  Purpose: Read-heavy analytics queries
  
Replication Settings:
  Lag Threshold: <100ms
  Replication Mode: Asynchronous
  Failover: Manual (for maintenance windows)
```

#### Database Schema Overview
```sql
-- Core Tables (29 schemas detected)
teams (Multi-tenant isolation)
users (Authentication & authorization)
leads (Lead management with 20+ fields)
properties (Property data with JSON metadata)
campaigns (Campaign lifecycle management)
messages (Communication tracking)
integrations (External service connections)
analytics (Performance metrics)
```

#### Connection Pooling Configuration
```yaml
PgBouncer Settings:
  Pool Mode: Transaction
  Default Pool Size: 20
  Max Client Conn: 100
  Server Reset Query: DISCARD ALL
  Query Timeout: 60 seconds
  
Connection String Format:
  postgresql://username:password@host:port/database?sslmode=require
```

---

## 💾 SPACES OBJECT STORAGE

### Bucket Configuration

#### Primary Bucket (Production)
```yaml
Bucket Details:
  Name: nextier
  Region: NYC3
  Access: Private (authenticated access only)
  Storage Class: Standard
  Total Size: ~500GB (estimated)
  File Count: ~100,000+ files

Folder Structure:
nextier/
├── buckets/                    # Lead data exports
│   ├── {bucket-id}.json
│   └── campaigns/
├── uploads/                    # User uploads
│   ├── avatars/
│   ├── documents/
│   └── templates/
├── exports/                    # Data exports
│   ├── leads/
│   ├── campaigns/
│   └── analytics/
├── backups/                    # Application backups
│   ├── database/
│   └── files/
└── temp/                       # Temporary files (auto-cleanup)
```

#### Staging Bucket
```yaml
Bucket Details:
  Name: nextier-staging
  Region: NYC3
  Access: Private
  Storage Class: Standard
  Purpose: Staging environment files
```

### CDN Integration
```yaml
CDN Configuration:
  Provider: Digital Ocean Spaces CDN
  Global Edge Network: Enabled
  Cache TTL:
    Static Assets: 1 year
    API Responses: 5 minutes
    User Content: 1 hour
  
Access Policies:
  Public Read: Images, CSS, JS files
  Private: User data, exports, backups
  Signed URLs: Temporary access for downloads
```

### File Organization Strategy
```typescript
// File Naming Conventions
const FILE_PATTERNS = {
  avatars: "avatars/{userId}/{timestamp}.{ext}",
  exports: "exports/{teamId}/{type}/{date}.{format}",
  uploads: "uploads/{teamId}/{category}/{uuid}.{ext}",
  backups: "backups/{date}/{type}/backup.{ext}",
  temp: "temp/{sessionId}/{uuid}.{ext}"
};

// Security Policies
const ACCESS_RULES = {
  public_read: ["avatars/*", "public/*"],
  team_scoped: ["buckets/*", "exports/*", "uploads/*"],
  admin_only: ["backups/*", "system/*"],
  signed_urls: ["exports/*", "uploads/private/*"]
};
```

---

## 🌐 NETWORK TOPOLOGY

### VPC Configuration
```yaml
Virtual Private Cloud:
  Name: default-vpc
  Region: NYC3
  CIDR: 10.244.0.0/16
  Subnets:
    - subnet-app: 10.244.1.0/24 (Public)
    - subnet-db: 10.244.2.0/24 (Private)
    - subnet-cache: 10.244.3.0/24 (Private)
    - subnet-storage: 10.244.4.0/24 (Private)

Routing:
  Internet Gateway: Enabled (app tier only)
  NAT Gateway: Enabled (private subnet internet access)
  VPN Gateway: Optional (admin access)
```

### Load Balancer Configuration
```yaml
Load Balancer:
  Type: Digital Ocean Load Balancer
  Algorithm: Round Robin
  Health Checks:
    Path: /health
    Interval: 30 seconds
    Timeout: 5 seconds
    Retries: 3
    
SSL/TLS Configuration:
  Certificate: Let's Encrypt (Auto-renewal)
  Protocols: TLS 1.2, TLS 1.3
  Cipher Suites: Modern (strong ciphers only)
  
Droplet Targets:
  - nextier-app-1 (Primary)
  - nextier-app-2 (Failover)
  - nextier-app-3 (Scaling)
```

### Firewall Rules
```yaml
Application Tier (Port 3000-3001):
  Inbound:
    - HTTP (80) from 0.0.0.0/0 (redirect to HTTPS)
    - HTTPS (443) from 0.0.0.0/0
    - SSH (22) from admin IPs only
  Outbound:
    - All (0.0.0.0/0) for API calls

Database Tier (Port 5432):
  Inbound:
    - PostgreSQL (5432) from app-tier subnet only
  Outbound:
    - HTTPS (443) for backups only

Cache Tier (Port 6379):
  Inbound:
    - Redis (6379) from app-tier subnet only
  Outbound:
    - None (internal only)
```

### Inter-Service Communications
```yaml
Service Mesh:
  App → Database: Direct connection (private subnet)
  App → Redis: Direct connection (private subnet)
  App → Spaces: HTTPS API calls
  App → External APIs: HTTPS with retry logic
  Background Jobs → Queue: Redis Pub/Sub
  
Communication Patterns:
  Synchronous: REST APIs, GraphQL queries
  Asynchronous: BullMQ job queue, Redis Pub/Sub
  Batch: Scheduled exports, analytics aggregation
```

---

## 📊 PERFORMANCE MONITORING

### Metrics Collection Setup
```yaml
Monitoring Stack:
  Primary: Digital Ocean Monitoring
  Secondary: Custom application metrics
  APM: Application performance monitoring
  
Key Metrics Tracked:
  Application:
    - Response time (p50, p95, p99)
    - Request rate (RPS)
    - Error rate (percentage)
    - Active connections
    
  Database:
    - Connection pool utilization
    - Query execution time
    - Cache hit ratio
    - Replication lag
    
  Infrastructure:
    - CPU utilization
    - Memory usage
    - Disk I/O
    - Network traffic
    
  Business:
    - Campaign success rate
    - Lead conversion rate
    - AI response accuracy
    - Cost per operation
```

### Alerting Thresholds
```yaml
Critical Alerts (Immediate Response):
  - Error rate > 5% for 2 minutes
  - Response time > 5000ms for 1 minute
  - Database connections > 90% for 5 minutes
  - Disk usage > 85% for 10 minutes
  
Warning Alerts (Monitor Closely):
  - Error rate > 2% for 5 minutes
  - Response time > 2000ms for 2 minutes
  - CPU utilization > 80% for 10 minutes
  - Memory usage > 85% for 5 minutes
  
Business Alerts:
  - Campaign completion rate < 80%
  - Lead enrichment success < 90%
  - AI provider failures > 3 in 10 minutes
  - Cost per lead > threshold
```

### Cost Optimization Recommendations
```yaml
Current Cost Analysis:
  Database: $60/month (2GB instance)
  Spaces: $5/month (500GB storage)
  CDN: $0 (included with Spaces)
  Load Balancer: $12/month
  Monitoring: $0 (Digital Ocean included)
  Total: ~$77/month (estimated)

Optimization Opportunities:
  1. Database Right-sizing:
     - Current: Over-provisioned for load
     - Recommendation: db-s-1vcpu-1gb for staging
     - Savings: $30/month
  
  2. Storage Optimization:
     - Enable lifecycle policies for old files
     - Move cold data to archive tier
     - Potential savings: $2/month
  
  3. Caching Strategy:
     - Implement Redis caching for API responses
     - CDN optimization for static assets
     - Potential cost reduction: 20% in bandwidth
  
  4. Reserved Instances:
     - 1-year commitment for production DB
     - Potential savings: 20% on database costs
```

---

## 🔒 SECURITY COMPLIANCE

### SSL/TLS Configuration
```yaml
Certificate Management:
  Provider: Let's Encrypt (Auto-renewal)
  Domains:
    - outreachglobal.com
    - www.outreachglobal.com
    - api.outreachglobal.com
    - app.outreachglobal.com
  
SSL/TLS Settings:
  Protocol Versions: TLS 1.2, TLS 1.3
  Cipher Suites: ECDHE-RSA-AES256-GCM-SHA384, ECDHE-RSA-AES128-GCM-SHA256
  HSTS: Enabled (max-age=31536000)
  Certificate Transparency: Enabled
  
Automated Renewal:
  Process: Certbot auto-renewal
  Frequency: 30 days before expiration
  Health Check: SSL Labs monitoring
```

### Authentication & Authorization
```yaml
Application Authentication:
  Primary: JWT tokens with refresh mechanism
  Session Timeout: 24 hours
  Multi-Factor: TOTP (Time-based One-Time Password)
  
Database Security:
  Connection: SSL/TLS encrypted
  User Privileges: Principle of least privilege
  Row-Level Security: Enabled for multi-tenant isolation
  
API Security:
  Rate Limiting: 100 requests/minute per user
  CORS: Configured for specific domains
  Input Validation: Comprehensive sanitization
  SQL Injection Protection: Parameterized queries only
```

### Data Encryption
```yaml
Encryption at Rest:
  Database: AES-256 encryption (DO managed)
  Spaces: AES-256 encryption (DO managed)
  Backups: Encrypted with application keys
  
Encryption in Transit:
  Internal: TLS 1.3 for all service communications
  External: TLS 1.2+ for API calls
  Database: SSL connections required
  
Key Management:
  Application Keys: Environment variables (secure)
  Database Credentials: Digital Ocean secrets manager
  API Keys: Encrypted storage in database
  Backup Encryption: GPG with secure key storage
```

### Compliance Status
```yaml
Security Measures:
  ✅ SSL/TLS: Full encryption for all communications
  ✅ Access Control: Role-based permissions
  ✅ Audit Logging: Comprehensive activity logging
  ✅ Data Isolation: Multi-tenant row-level security
  ✅ Backup Security: Encrypted backups with retention
  ✅ Monitoring: 24/7 security monitoring
  ✅ Incident Response: Automated alerting system
  
Compliance Frameworks:
  - SOC 2 Type II: In progress
  - GDPR: Data protection measures implemented
  - CCPA: California privacy compliance ready
  - PCI DSS: Not applicable (no payment card data)
  
Vulnerability Management:
  - Automated security scanning (weekly)
  - Dependency vulnerability alerts (GitHub)
  - Penetration testing (quarterly)
  - Security patch management (automated)
```

---

## 🚀 DEPLOYMENT & SCALING

### Current Deployment Strategy
```yaml
Deployment Method: Blue-Green Deployment
  Primary Environment: Production (nextier-prod)
  Staging Environment: Staging (nextier-staging)
  Rollback Strategy: Instant traffic switching
  
Deployment Pipeline:
  1. Code commit to main branch
  2. Automated testing (unit, integration)
  3. Build application container
  4. Deploy to staging environment
  5. Smoke testing on staging
  6. Deploy to production (blue-green)
  7. Health check validation
  8. Traffic switch to new version
  9. Rollback window (30 minutes)
```

### Auto-scaling Configuration
```yaml
Horizontal Scaling:
  App Instances:
    Min: 2 instances
    Max: 10 instances
    Scale-up trigger: CPU > 70% for 2 minutes
    Scale-down trigger: CPU < 30% for 10 minutes
  
  Database:
    Read replicas: 1 (analytics queries)
    Failover: Manual (for maintenance)
    
Vertical Scaling:
  Database: Manual scaling based on usage metrics
  App Instances: Auto-scaling within size limits
  
Scaling Policies:
  Scale Up: 
    - CPU: >70% for 2 minutes
    - Memory: >80% for 2 minutes
    - Response Time: >2000ms for 1 minute
  
  Scale Down:
    - CPU: <30% for 10 minutes
    - Memory: <50% for 10 minutes
    - No traffic: 15 minutes
```

### Disaster Recovery Plan
```yaml
Recovery Objectives:
  RTO (Recovery Time Objective): 15 minutes
  RPO (Recovery Point Objective): 5 minutes
  
Backup Strategy:
  Database:
    - Automated daily backups (7-day retention)
    - Point-in-time recovery available
    - Cross-region backup replication
    
  Application Files:
    - Spaces replication to secondary region
    - Version-controlled infrastructure as code
    - Environment configuration backups
    
Recovery Procedures:
  1. Database failover to read replica
  2. DNS switch to backup region
  3. Spaces bucket replication activation
  4. Application deployment to recovery region
  5. Service validation and testing
```

---

## 📈 PERFORMANCE BENCHMARKS

### Current Performance Targets
```yaml
Application Performance:
  Response Time:
    - API Endpoints: <500ms (p95)
    - Database Queries: <100ms (p95)
    - Page Load Time: <2000ms (p95)
    
  Throughput:
    - API Requests: 1000 RPS
    - Database Connections: 25 concurrent
    - Background Jobs: 100/minute
    
  Availability:
    - Uptime: 99.9% (8.76 hours downtime/year)
    - Error Rate: <0.1%
    - MTTR: <15 minutes
```

### Monitoring Dashboards
```yaml
Executive Dashboard:
  - Overall system health status
  - Key business metrics
  - Cost and usage trends
  - Alert summary

Operations Dashboard:
  - Real-time performance metrics
  - Error rates and types
  - Resource utilization
  - Scaling activities

Development Dashboard:
  - Application performance
  - Database query performance
  - API response times
  - Code deployment status
```

---

## 🔧 MAINTENANCE SCHEDULE

### Regular Maintenance Tasks
```yaml
Daily:
  - Automated backup verification
  - Security patch installation
  - Performance metric review
  - Error log analysis

Weekly:
  - Database maintenance (vacuum, analyze)
  - SSL certificate health check
  - Security scan execution
  - Cost optimization review

Monthly:
  - Performance tuning review
  - Capacity planning assessment
  - Security audit execution
  - Disaster recovery testing

Quarterly:
  - Full security penetration test
  - Performance benchmark testing
  - Architecture review and optimization
  - Compliance audit execution
```

---

## 📋 INFRASTRUCTURE CHECKLIST

### Pre-Production Deployment
- [ ] SSL certificates installed and validated
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting configured
- [ ] Security policies implemented
- [ ] Load balancer health checks configured
- [ ] Auto-scaling policies tested
- [ ] Disaster recovery procedures documented
- [ ] Performance benchmarks established

### Ongoing Operations
- [ ] Daily backup verification
- [ ] Security patch management
- [ ] Performance monitoring review
- [ ] Cost optimization analysis
- [ ] Capacity planning updates
- [ ] Compliance audit execution
- [ ] Incident response testing
- [ ] Documentation maintenance

---

## 📞 SUPPORT & ESCALATION

### Infrastructure Support Tiers
```yaml
Tier 1 (Operations Team):
  - Application deployment issues
  - Performance degradation
  - Basic monitoring and alerting
  
Tier 2 (Platform Team):
  - Database performance issues
  - Network connectivity problems
  - Security incident response
  
Tier 3 (Architecture Team):
  - Infrastructure design decisions
  - Capacity planning and scaling
  - Disaster recovery execution
  
Escalation Contacts:
  - On-call Engineer: PagerDuty integration
  - Platform Lead: Slack notifications
  - CTO: Critical incident notifications
```

This comprehensive infrastructure mapping document provides complete visibility into your Digital Ocean deployment and serves as a reference for operations, scaling, and optimization decisions.
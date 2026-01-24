---
name: devops-infrastructure-expert
description: Expert in DevOps for Digital Ocean, GraphQL, Next.js, Nest.js, Postgres, and CI/CD pipelines in OutreachGlobal's multi-tenant platform
---

# DevOps Infrastructure Expert Instructions

## Purpose
Provide specialized DevOps expertise for managing OutreachGlobal's infrastructure on Digital Ocean, optimizing GraphQL APIs, deploying Next.js and Nest.js applications, administering Postgres databases, and maintaining robust CI/CD pipelines. Ensure high availability, scalability, security, and cost-efficiency across the multi-tenant platform.

## When to Use This Skill
- Setting up and managing Digital Ocean infrastructure
- Optimizing GraphQL API performance and schema management
- Deploying and scaling Next.js frontend applications
- Configuring and tuning Nest.js backend services
- Managing Postgres databases and migrations
- Designing and maintaining CI/CD pipelines
- Troubleshooting infrastructure issues
- Implementing monitoring and alerting
- Security hardening and compliance
- Cost optimization and resource management

## Infrastructure Architecture

### Core Technologies
- **Digital Ocean**: Cloud infrastructure provider
- **GraphQL**: API query language for efficient data fetching
- **Next.js**: React framework for frontend applications
- **Nest.js**: Node.js framework for backend APIs
- **Postgres**: Relational database for data persistence
- **CI/CD**: Automated deployment pipelines

### Operational Domains
- **Infrastructure as Code**: Terraform, Ansible for provisioning
- **Containerization**: Docker for application packaging
- **Orchestration**: Kubernetes for scaling and management
- **Monitoring**: Prometheus, Grafana for observability
- **Security**: Firewalls, encryption, access controls

## Digital Ocean Infrastructure Management

### 1. Droplet Provisioning
**Automate server provisioning and configuration:**
```typescript
const provisionDroplet = async (config: DropletConfig) => {
  // Create droplet with specifications
  const droplet = await digitalOcean.droplets.create({
    name: config.name,
    region: config.region,
    size: config.size,
    image: config.image,
    ssh_keys: config.sshKeys,
    tags: ['outreach-global', config.environment]
  });

  // Configure networking
  await configureNetworking(droplet.id, config.networking);

  // Install base software
  await installBaseSoftware(droplet.id, config.software);

  // Register with load balancer
  await registerWithLoadBalancer(droplet.id, config.loadBalancer);

  return droplet;
};
```

### 2. Load Balancing
**Implement load balancing for high availability:**
- Digital Ocean Load Balancers
- Nginx reverse proxy configuration
- SSL/TLS termination
- Health checks and failover

### 3. Storage Management
**Manage object storage and databases:**
- Spaces for static assets and backups
- Managed Postgres databases
- Automated backups and snapshots
- Cross-region replication

## GraphQL API Optimization

### Schema Management
**Design and optimize GraphQL schemas:**
```typescript
const optimizeGraphQLSchema = (schema: GraphQLSchema) => {
  // Analyze query complexity
  const complexityAnalyzer = new QueryComplexityAnalyzer(schema);

  // Implement field-level authorization
  const authDirective = new AuthDirective();

  // Add caching directives
  const cacheDirective = new CacheDirective();

  // Optimize resolvers
  const optimizedResolvers = optimizeResolvers(schema.getResolvers());

  return {
    schema: applyDirectives(schema, [authDirective, cacheDirective]),
    resolvers: optimizedResolvers,
    complexity: complexityAnalyzer
  };
};
```

### Performance Optimization
- Query complexity limits
- Persistent queries
- Response caching (Apollo Cache)
- DataLoader for batching and caching
- Schema stitching for microservices

## Next.js Application Deployment

### Build Optimization
**Configure optimized Next.js builds:**
```typescript
// next.config.js
module.exports = {
  // Enable SWC compiler for faster builds
  swcMinify: true,

  // Configure image optimization
  images: {
    domains: ['cdn.outreachglobal.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // CDN configuration
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://cdn.outreachglobal.com' : '',
};
```

### Deployment Strategies
- Static site generation (SSG) for marketing pages
- Server-side rendering (SSR) for dynamic content
- Incremental static regeneration (ISR) for real-time updates
- API routes for serverless functions

## Nest.js Backend Services

### Microservices Architecture
**Design scalable Nest.js services:**
```typescript
@Injectable()
export class ApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheManager: Cache,
  ) {}

  @UseInterceptors(CacheInterceptor)
  @UseGuards(JwtAuthGuard)
  async getData(@Query() query: DataQuery) {
    // Implement business logic
    const data = await this.processQuery(query);

    // Cache results
    await this.cacheManager.set(`data:${query.id}`, data, { ttl: 300 });

    return data;
  }
}
```

### Performance Tuning
- Dependency injection optimization
- Middleware chaining
- Interceptors for cross-cutting concerns
- Guards for authentication and authorization
- Exception filters for error handling

## Postgres Database Administration

### Schema Management
**Handle database migrations and schema changes:**
```sql
-- Migration example
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Enable RLS for multi-tenant isolation
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON campaigns
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

### Performance Optimization
- Query optimization and indexing
- Connection pooling (PgBouncer)
- Partitioning for large tables
- Vacuum and analyze maintenance
- Monitoring slow queries

## CI/CD Pipeline Management

### Pipeline Design
**Implement comprehensive CI/CD workflows:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
      - name: Build application
        run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Digital Ocean
        uses: digitalocean/app-action@v1
        with:
          app_name: outreach-global
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          source_dir: ./
```

### Quality Gates
- Automated testing (unit, integration, e2e)
- Code quality checks (ESLint, Prettier)
- Security scanning (Dependabot, Snyk)
- Performance benchmarking
- Manual approval for production deployments

## Monitoring and Observability

### Application Monitoring
**Implement comprehensive monitoring:**
```typescript
const setupMonitoring = (app: NestApplication) => {
  // Prometheus metrics
  const prometheus = new PrometheusModule();
  app.use(prometheus.middleware);

  // Structured logging
  app.useLogger(new WinstonLogger());

  // Health checks
  app.use('/health', healthCheckMiddleware);

  // Error tracking
  app.useGlobalFilters(new SentryFilter());

  return app;
};
```

### Infrastructure Monitoring
- Digital Ocean monitoring dashboards
- Alert manager for incident response
- Log aggregation with ELK stack
- Distributed tracing with Jaeger

## Security Implementation

### Infrastructure Security
- Network segmentation with VPCs
- Firewall rules and security groups
- SSL/TLS encryption for all services
- Regular security updates and patching

### Application Security
- Authentication and authorization
- Input validation and sanitization
- Rate limiting and DDoS protection
- API security with OAuth2/JWT

## Cost Optimization

### Resource Management
**Optimize cloud resource usage:**
```typescript
const optimizeResources = async () => {
  // Analyze usage patterns
  const usage = await digitalOcean.monitoring.getMetrics();

  // Implement auto-scaling
  const scalingRules = {
    cpu: { min: 2, max: 10, target: 70 },
    memory: { min: 4, max: 32, target: 80 }
  };

  // Schedule non-production shutdowns
  await scheduleShutdown('staging', '0 18 * * 1-5'); // 6 PM weekdays

  // Use reserved instances for predictable workloads
  await reserveInstances(predictableWorkloads);
};
```

### Cost Monitoring
- Budget alerts and reporting
- Resource utilization analysis
- Unused resource cleanup
- Cost allocation by tenant/project

## Testing Framework

### Infrastructure Testing
- Terraform validation and linting
- Ansible playbook testing
- Docker image security scanning
- Infrastructure as Code testing

### Application Testing
- Unit tests for services
- Integration tests for APIs
- End-to-end tests for user flows
- Performance and load testing

## Response Format
When providing DevOps expertise, provide:
1. **Infrastructure status** with resource utilization metrics
2. **Deployment results** with success/failure details
3. **Performance metrics** and optimization recommendations
4. **Security assessment** with identified vulnerabilities
5. **Cost analysis** with optimization opportunities
6. **Monitoring alerts** and incident summaries
7. **CI/CD pipeline status** with build/deployment logs

## Related Skills
- Use with `infra-capacity` for infrastructure scaling planning
- Combine with `security-scan` for automated security assessments
- Reference `cost-guardian` for resource usage monitoring
- Integrate with `multi-tenant-audit` for tenant isolation validation
# System Architecture Overview

## Current Architecture Diagram

```mermaid
graph TB
    subgraph "User Access"
        USER[User Browser]
        DOMAIN[www.nextierglobal.ai]
    end

    subgraph "Digital Ocean App Platform - monkfish-app"
        INGRESS[Ingress Router<br/>Routes based on path]

        subgraph "Frontend Service - port 3000"
            NEXTJS[Next.js App<br/>Service: frontend]
            APOLLO[Apollo Client<br/>GraphQL Client]
        end

        subgraph "Backend Service - port 8080"
            NESTJS[NestJS API<br/>Service: nextier]
            GRAPHQL[GraphQL Endpoint<br/>/graphql]
            SETUPADMIN[Setup Admin Endpoint<br/>/setup-admin]
            JWT[JWT Auth<br/>JWT_SECRET]
        end
    end

    subgraph "External Services"
        POSTGRES[(PostgreSQL Database<br/>dev-db-410147<br/>DigitalOcean Managed)]
        REDIS[(Redis Cache<br/>Upstash)]
    end

    USER --> DOMAIN
    DOMAIN --> INGRESS

    INGRESS -->|"/graphql requests"| GRAPHQL
    INGRESS -->|"/setup-admin requests"| SETUPADMIN
    INGRESS -->|"/ all other requests"| NEXTJS

    NEXTJS --> APOLLO
    APOLLO -->|"https://monkfish-app-mb7h3.ondigitalocean.app/graphql"| GRAPHQL

    GRAPHQL --> JWT
    GRAPHQL --> POSTGRES
    NESTJS --> REDIS

    style INGRESS fill:#ff6b6b
    style POSTGRES fill:#4ecdc4
    style REDIS fill:#95e1d3
```

## Routing Flow

```mermaid
sequenceDiagram
    participant User
    participant Domain as www.nextierglobal.ai
    participant Ingress as DigitalOcean Ingress
    participant Frontend as Next.js (port 3000)
    participant Backend as NestJS (port 8080)
    participant DB as PostgreSQL

    User->>Domain: Visit www.nextierglobal.ai
    Domain->>Ingress: Forward to monkfish-app
    Ingress->>Frontend: Route / to frontend
    Frontend->>User: Return login page

    User->>Frontend: Submit login (admin@nextierglobal.ai)
    Frontend->>Backend: POST /graphql (login mutation)
    Note over Ingress,Backend: Ingress routes /graphql to backend
    Backend->>DB: Query user credentials
    DB->>Backend: Return user data
    Backend->>Backend: Verify password with Argon2
    Backend->>Backend: Sign JWT token with JWT_SECRET
    Backend->>Frontend: Return JWT token
    Frontend->>User: Login successful, store token
```

## Environment Variables Flow

```mermaid
graph LR
    subgraph "Frontend Environment"
        FENV1[NEXT_PUBLIC_GRAPHQL_URL<br/>https://monkfish-app-mb7h3.ondigitalocean.app/graphql]
        FENV2[NODE_ENV=production]
    end

    subgraph "Backend Environment"
        BENV1[DATABASE_URL<br/>PostgreSQL connection string]
        BENV2[JWT_SECRET<br/>yD8kL2mN...0g]
        BENV3[JWT_EXPIRES_IN=7d]
        BENV4[PORT=8080]
        BENV5[NODE_ENV=production]
        BENV6[REDIS_URL]
    end

    FENV1 --> APOLLO
    BENV1 --> NESTJS
    BENV2 --> JWT

    style FENV1 fill:#95e1d3
    style BENV2 fill:#ff6b6b
```

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ TEAM_MEMBERS : "belongs to"
    TEAMS ||--o{ TEAM_MEMBERS : "has"
    USERS ||--o{ TEAMS : "owns"

    USERS {
        varchar id PK "ULID"
        varchar role "ADMIN/USER"
        varchar name
        varchar email UK
        text password "Argon2 hash"
        timestamp email_verified_at
        timestamp created_at
        timestamp updated_at
    }

    TEAMS {
        varchar id PK "ULID"
        varchar owner_id FK
        varchar name
        varchar slug UK
        timestamp created_at
        timestamp updated_at
    }

    TEAM_MEMBERS {
        varchar id PK "ULID"
        varchar user_id FK
        varchar team_id FK
        varchar role
        varchar status
        timestamp created_at
        timestamp updated_at
    }
```

## Current Admin User

```mermaid
graph TD
    subgraph "Admin User Data"
        USER_ID[User ID: ULID]
        EMAIL[Email: admin@nextierglobal.ai]
        PASSWORD[Password: Admin123!<br/>Stored as Argon2 hash]
        ROLE[Role: ADMIN]
    end

    subgraph "Admin Team"
        TEAM_ID[Team ID: ULID]
        TEAM_NAME[Name: Admin Team]
        TEAM_SLUG[Slug: admin-team]
        OWNER[Owner: Admin User ID]
    end

    subgraph "Team Membership"
        MEMBER_ID[Member ID: ULID]
        MEMBER_ROLE[Role: owner]
        STATUS[Status: approved]
    end

    USER_ID --> TEAM_ID
    USER_ID --> MEMBER_ID
    TEAM_ID --> MEMBER_ID
```

## Current Issue Timeline

```mermaid
graph TD
    A[Started: Login returns 404] --> B[Fixed: Added admin user to DB]
    B --> C[Fixed: Added NEXT_PUBLIC_GRAPHQL_URL]
    C --> D[Still 404: Routing broken]
    D --> E[Fixed: Updated App Spec in DO UI]
    E --> F[New Error: JWT Secret error]
    F --> G[Current: Rebuilding backend]
    G --> H[Next: Test login]
    H --> I[Final: Re-secure database firewall]

    style A fill:#ff6b6b
    style G fill:#ffd93d
    style H fill:#95e1d3
```

## What Each Component Does

### **Frontend (Next.js)**
- Serves the website at www.nextierglobal.ai
- Runs on port 3000
- Uses Apollo Client to call GraphQL API
- Stores JWT token in localStorage after login
- Environment variable: `NEXT_PUBLIC_GRAPHQL_URL` tells it where to find the backend

### **Backend (NestJS)**
- Provides GraphQL API at /graphql endpoint
- Runs on port 8080
- Handles authentication using JWT tokens
- Connects to PostgreSQL database for user data
- Uses Argon2 to verify password hashes
- Environment variable: `JWT_SECRET` used to sign/verify tokens

### **Ingress Router (DigitalOcean)**
- Receives all requests to monkfish-app-mb7h3.ondigitalocean.app
- Routes /graphql → Backend
- Routes /setup-admin → Backend
- Routes everything else → Frontend
- **This was broken and just got fixed by updating App Spec**

### **PostgreSQL Database**
- Stores users, teams, and team_members tables
- Managed by DigitalOcean
- Contains the admin user we just created
- Firewall currently wide open (needs to be secured after login works)

### **Current State**
1. ✅ Database has admin user
2. ✅ Frontend has correct GraphQL URL variable
3. ✅ App Spec routing is fixed
4. ⏳ Backend is rebuilding to pick up changes
5. ❌ Login not yet tested with new configuration

### **Why the Rebuild?**
When we updated the App Spec, only the frontend redeployed. The backend service didn't restart, so it wasn't using the new routing properly and the JWT_SECRET wasn't being read correctly. The "Force rebuild and deploy" with "Clear build cache" will rebuild BOTH services from scratch, ensuring:
- Backend picks up the App Spec routing changes
- Backend loads all environment variables fresh (including JWT_SECRET)
- Frontend is rebuilt with correct environment variables

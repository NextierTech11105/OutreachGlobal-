# RealEstate API Explorer - Non-Technical Overview

## 🎯 What is This?

The RealEstate API Explorer is a powerful property intelligence platform that helps real estate investors find, analyze, and target motivated sellers. It's like having a supercharged property search engine combined with a deal-scoring AI that tells you which properties are the best opportunities.

## 📊 System Architecture

```mermaid
graph TB
    User[👤 User] --> Browser[🌐 Web Browser]
    Browser --> Frontend[⚛️ Next.js Frontend<br/>Port 3000]
    Frontend --> Backend[🔧 NestJS Backend<br/>Port 4000]
    Backend --> RealEstateAPI[🏠 RealEstate API<br/>Property Data]
    Backend --> SkipTraceAPI[🔍 Skip Trace API<br/>Contact Data]
    Backend --> Database[(🗄️ PostgreSQL<br/>Database)]
    Backend --> Storage[☁️ DigitalOcean Spaces<br/>Object Storage]

    style User fill:#e1f5ff
    style Frontend fill:#61dafb
    style Backend fill:#ea2845
    style RealEstateAPI fill:#4caf50
    style SkipTraceAPI fill:#ff9800
    style Database fill:#336791
    style Storage fill:#0080ff
```

## 🔄 How the System Works

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant RealEstateAPI
    participant SkipTrace
    participant Database

    User->>Frontend: 1. Enter search criteria<br/>(State, City, Equity %, etc.)
    Frontend->>Backend: 2. Send search request
    Backend->>RealEstateAPI: 3. Query property database
    RealEstateAPI-->>Backend: 4. Return properties
    Backend->>Backend: 5. Calculate Deal Scores<br/>(REI 8020 Algorithm)
    Backend-->>Frontend: 6. Send scored results
    Frontend-->>User: 7. Display properties<br/>with color-coded scores

    User->>Frontend: 8. Select properties<br/>for skip trace
    Frontend->>Backend: 9. Request contact data
    Backend->>SkipTrace: 10. Lookup owner contacts
    SkipTrace-->>Backend: 11. Return phone/email
    Backend->>Database: 12. Save enriched data
    Backend-->>Frontend: 13. Return contact info
    Frontend-->>User: 14. Display owner contacts
```

## 🎨 User Journey - Step by Step

```mermaid
journey
    title Real Estate Investor Property Search Journey
    section Search Setup
      Choose search type: 5: Investor
      Select location: 5: Investor
      Set property filters: 4: Investor
      Add distress signals: 5: Investor
    section Search Results
      Execute search: 5: Investor
      View deal scores: 5: Investor
      Review properties: 4: Investor
      Select hot deals: 5: Investor
    section Enrichment
      Run skip trace: 4: Investor
      Get owner contacts: 5: Investor
      Export to CSV: 4: Investor
      Push to campaign: 5: Investor
    section Automation
      Save search: 5: Investor
      Enable daily run: 5: Investor
      Track new listings: 5: Investor
      Monitor changes: 4: Investor
```

## 🏆 Deal Scoring System (REI 8020 Algorithm)

The system automatically scores every property from 0-100 based on multiple factors:

```mermaid
graph LR
    Property[🏠 Property] --> Equity[💰 Equity Scoring<br/>30 points max]
    Property --> Distress[🚨 Distress Signals<br/>25 points max]
    Property --> Owner[👤 Owner Type<br/>20 points max]
    Property --> Portfolio[📊 Investor Status<br/>15 points max]
    Property --> MLS[📋 MLS Status<br/>10 points max]

    Equity --> Score[🎯 Deal Score]
    Distress --> Score
    Owner --> Score
    Portfolio --> Score
    MLS --> Score

    Score --> Hot[🔥 90-100: Hot Deal]
    Score --> Good[✅ 70-89: Good Deal]
    Score --> Warm[⚠️ 50-69: Warm Lead]
    Score --> Cold[❄️ 0-49: Cold Lead]

    style Property fill:#4caf50
    style Score fill:#ff9800
    style Hot fill:#f44336
    style Good fill:#4caf50
    style Warm fill:#ff9800
    style Cold fill:#2196f3
```

### Scoring Breakdown:

**Equity Scoring (0-30 points)**
- 80%+ equity = 30 points (Owned outright or nearly)
- 60-79% equity = 20 points (Good equity position)
- 40-59% equity = 10 points (Moderate equity)

**Distress Signals (0-25 points)**
- Pre-foreclosure = 15 points
- Foreclosure = 15 points
- Vacant property = 10 points
- Lis Pendens = 10 points

**Owner Type (0-20 points)**
- Absentee owner = 10 points (Lives elsewhere)
- Out-of-state = 5 points (Harder to manage)
- Corporate owned = 5 points (Business decision-makers)

**Portfolio/Investor (0-15 points)**
- 10+ properties = 15 points (Active investor)
- 5-9 properties = 10 points (Growing portfolio)
- 2-4 properties = 5 points (Small investor)

**MLS Status (0-10 points)**
- Off-market = 10 points (Less competition)
- Listed = 0 points (Public market)

## 🔍 Three-Step Search Wizard

```mermaid
stateDiagram-v2
    [*] --> Step1_What
    Step1_What --> Step2_Demographics: Select Type<br/>(Properties/Businesses/Both)

    Step2_Demographics --> Step2_Geo: Add Location Filters
    Step2_Geo --> Step2_Type: Add Property Type
    Step2_Type --> Step2_Owner: Add Owner Filters
    Step2_Owner --> Step3_EventSignals: Next

    Step3_EventSignals --> Step3_Equity: Set Equity %
    Step3_Equity --> Step3_Distress: Add Distress Signals
    Step3_Distress --> ExecuteSearch: Execute Search

    ExecuteSearch --> Results: Display Properties
    Results --> [*]

    note right of Step1_What
        WHAT
        Choose your target
    end note

    note right of Step2_Demographics
        WHO/WHERE
        Demographics & Location
    end note

    note right of Step3_EventSignals
        WHY
        Motivation & Distress
    end note
```

## 🎯 Key Features

### 1. Property Search (60+ Filters)
Search properties using sophisticated filters across multiple categories:

**Geographic Filters:**
- State, City, County, Zip Code
- Macro zip code targeting (search multiple zips at once)

**Property Characteristics:**
- Property Type (Single Family, Multi-Family, Commercial, Land)
- Building Size, Lot Size
- Bedrooms, Bathrooms
- Year Built, Units

**Financial Filters:**
- Market Value (min/max)
- Assessed Value
- Equity Percentage
- Loan Amount

**Owner Intelligence:**
- Absentee Owner
- Out-of-State Owner
- Corporate Owned
- Years Owned (5+ years filter)
- Portfolio Size (properties owned)
- Recent Purchases (last 12 months)

**Distress/Event Signals:**
- Pre-Foreclosure
- Foreclosure
- Vacant Property
- Lis Pendens
- Auction
- Recently Sold (last 12 months)

### 2. Four View Modes

```mermaid
graph TD
    Results[Search Results] --> List[📋 List View]
    Results --> Card[🃏 Card View]
    Results --> Detail[📄 Detail View]
    Results --> Map[🗺️ Map View]

    List --> ListFeatures[• Quick scanning<br/>• Sortable columns<br/>• Bulk selection<br/>• Deal score badges]
    Card --> CardFeatures[• Visual layout<br/>• Key metrics<br/>• Property images<br/>• Quick actions]
    Detail --> DetailFeatures[• Full property data<br/>• Owner information<br/>• Mortgage details<br/>• Sale history]
    Map --> MapFeatures[• Geographic clustering<br/>• Color-coded pins<br/>• Deal score visualization<br/>• Interactive markers]

    style Results fill:#2196f3
    style List fill:#4caf50
    style Card fill:#ff9800
    style Detail fill:#9c27b0
    style Map fill:#f44336
```

### 3. Skip Trace Integration

```mermaid
flowchart LR
    A[Select Properties] --> B{Skip Trace}
    B --> C[Property Details API]
    B --> D[Skip Trace API]
    C --> E[Property Data]
    D --> F[Owner Contact Data]
    E --> G[Enriched Property]
    F --> G
    G --> H[Phone Numbers]
    G --> I[Email Addresses]
    G --> J[Relatives]
    G --> K[Associates]

    style A fill:#2196f3
    style B fill:#ff9800
    style G fill:#4caf50
    style H fill:#e91e63
    style I fill:#e91e63
    style J fill:#e91e63
    style K fill:#e91e63
```

### 4. Saved Search Automation

```mermaid
flowchart TD
    A[Create Search] --> B[Save Search Parameters]
    B --> C[Enable Daily Automation]
    C --> D[Daily Cron Job<br/>Runs at Midnight]
    D --> E{New Properties?}
    E -->|Yes| F[Detect New Listings]
    E -->|No| G[Log: No Changes]
    F --> H[Trigger Event Signals]
    H --> I[Send Notifications]
    H --> J[Update Dashboard]
    H --> K[Add to Campaign Queue]

    style A fill:#2196f3
    style C fill:#4caf50
    style D fill:#ff9800
    style F fill:#f44336
    style H fill:#9c27b0
```

### 5. Campaign Integration

```mermaid
sequenceDiagram
    participant User
    participant Explorer
    participant Campaign
    participant Outreach

    User->>Explorer: Select 50 properties
    User->>Explorer: Click "Push to Campaign"
    Explorer->>Explorer: Verify skip trace data
    Explorer->>Campaign: Create campaign leads
    Campaign->>Campaign: Assign message template
    Campaign->>Campaign: Set outreach schedule
    Campaign->>Outreach: Queue messages
    Outreach-->>User: Send SMS/Email/Mail
    Outreach-->>Campaign: Track responses
    Campaign-->>User: Show analytics
```

## 📁 Data Flow Architecture

```mermaid
flowchart TD
    subgraph Input
        A[User Input] --> B[Search Filters]
        B --> C[Query Builder]
    end

    subgraph Processing
        C --> D[Backend API]
        D --> E[Parameter Validation]
        E --> F[Convert to snake_case]
        F --> G[External API Call]
    end

    subgraph External
        G --> H[RealEstate API]
        H --> I[Return Property Data]
    end

    subgraph Enrichment
        I --> J[Calculate Deal Scores]
        J --> K[Sort by Score]
        K --> L[Apply View Mode]
    end

    subgraph Output
        L --> M[Display Results]
        M --> N[User Actions]
        N --> O{Action Type}
        O -->|Export| P[CSV Download]
        O -->|Enrich| Q[Skip Trace]
        O -->|Save| R[Database Storage]
        O -->|Campaign| S[Queue for Outreach]
    end

    style Input fill:#e3f2fd
    style Processing fill:#fff3e0
    style External fill:#f3e5f5
    style Enrichment fill:#e8f5e9
    style Output fill:#fce4ec
```

## 🎮 User Interface Layout

```mermaid
graph TB
    subgraph Header
        A[RealEstate API Explorer]
    end

    subgraph Stats_Bar
        B[Total Results: 1,247]
        C[Saved Searches: 5]
        D[Results Loaded: 50]
        E[API Status: Active]
    end

    subgraph Tabs
        F[Property Search]
        G[Skip Trace]
        H[Saved Searches]
        I[Query History]
    end

    subgraph Search_Wizard
        J[Step 1: What?]
        K[Step 2: Demographics]
        L[Step 3: Event Signals]
        M[Execute Search]
    end

    subgraph Results_Section
        N[View Mode Selector]
        O[Action Bar]
        P[Results Grid/List]
    end

    subgraph Action_Bar
        Q[Select All]
        R[Skip Trace Selected]
        S[Export CSV]
        T[Push to Campaign]
    end

    Header --> Stats_Bar
    Stats_Bar --> Tabs
    Tabs --> Search_Wizard
    Search_Wizard --> Results_Section
    Results_Section --> Action_Bar

    style Header fill:#1976d2,color:#fff
    style Stats_Bar fill:#4caf50,color:#fff
    style Tabs fill:#ff9800,color:#fff
    style Search_Wizard fill:#9c27b0,color:#fff
    style Results_Section fill:#00bcd4,color:#fff
    style Action_Bar fill:#f44336,color:#fff
```

## 🔐 Authentication & Security

```mermaid
flowchart LR
    A[User] --> B{Auth Status}
    B -->|Development| C[Bypass Auth<br/>teamId = test]
    B -->|Production| D[Check JWT Token]
    D -->|Valid| E[Allow Access]
    D -->|Invalid| F[Redirect to Login]
    C --> G[Access RealEstate API]
    E --> G
    F --> H[Auth Page]

    style A fill:#2196f3
    style C fill:#ff9800
    style D fill:#4caf50
    style F fill:#f44336
    style G fill:#9c27b0
```

**Current State:**
- Development Mode: Authentication disabled (`teamId = "test"`)
- All users can access the RealEstate API Explorer
- No login required for testing

**Production State:**
- JWT-based authentication
- Team-based access control
- User permissions via team policies

## 📊 Database Schema

```mermaid
erDiagram
    SAVED_SEARCH {
        string id PK
        string teamId FK
        string searchName
        json searchQuery
        timestamp createdAt
        timestamp updatedAt
        boolean isActive
    }

    SEARCH_RESULT {
        string id PK
        string savedSearchId FK
        json properties
        int totalCount
        timestamp executedAt
    }

    ENRICHED_PROPERTY {
        string id PK
        string propertyId
        string teamId FK
        json propertyData
        json skipTraceData
        timestamp enrichedAt
    }

    AUTOMATION_LOG {
        string id PK
        string savedSearchId FK
        string status
        int newPropertiesCount
        json changesDetected
        timestamp executedAt
    }

    SAVED_SEARCH ||--o{ SEARCH_RESULT : "has many"
    SAVED_SEARCH ||--o{ AUTOMATION_LOG : "generates"
    SAVED_SEARCH ||--o{ ENRICHED_PROPERTY : "contains"
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph Local_Development
        A[localhost:3000<br/>Frontend]
        B[localhost:4000<br/>Backend]
        A <--> B
    end

    subgraph DigitalOcean_Cloud
        C[monkfish-app<br/>Frontend App]
        D[API App<br/>Backend]
        E[PostgreSQL<br/>Managed Database]
        F[Spaces<br/>Object Storage]

        C <--> D
        D <--> E
        D <--> F
    end

    subgraph External_Services
        G[RealEstate API]
        H[Skip Trace API]
    end

    B --> G
    B --> H
    D --> G
    D --> H

    style Local_Development fill:#e3f2fd
    style DigitalOcean_Cloud fill:#f3e5f5
    style External_Services fill:#fff3e0
```

## 🎯 Use Cases

### Use Case 1: Finding Distressed Properties

```mermaid
flowchart TD
    A[Investor wants<br/>distressed properties] --> B[Open RealEstate Explorer]
    B --> C[Select State: FL]
    C --> D[Enable Filters:<br/>• Pre-foreclosure<br/>• Vacant<br/>• High Equity]
    D --> E[Execute Search]
    E --> F[Review 47 Results]
    F --> G{Deal Score > 80?}
    G -->|Yes| H[15 Hot Deals Found]
    G -->|No| I[Skip lower scores]
    H --> J[Select all 15 properties]
    J --> K[Run Skip Trace]
    K --> L[Get owner contacts]
    L --> M[Export to CSV]
    M --> N[Push to SMS Campaign]

    style A fill:#f44336
    style H fill:#4caf50
    style N fill:#2196f3
```

### Use Case 2: Active Investor Targeting

```mermaid
flowchart TD
    A[Find active investors<br/>buying in Miami] --> B[Set Filters:<br/>• City: Miami<br/>• Properties Owned: 5+<br/>• Purchased Last 12mo: 2+]
    B --> C[Execute Search]
    C --> D[23 Active Investors Found]
    D --> E[Switch to Detail View]
    E --> F[Review Portfolio Data]
    F --> G[Select Top 10 Investors]
    G --> H[Run Skip Trace]
    H --> I[Get Business Contact Info]
    I --> J[Export with Portfolio Details]
    J --> K[Add to Partnership Campaign]

    style A fill:#2196f3
    style D fill:#4caf50
    style K fill:#ff9800
```

### Use Case 3: Daily Automation

```mermaid
flowchart TD
    A[Set Up Search:<br/>High Equity + Absentee] --> B[Save Search as<br/>Miami Hot Deals]
    B --> C[Enable Daily Automation]
    C --> D[System Runs Daily at Midnight]
    D --> E{New Properties?}
    E -->|Yes| F[Detect 3 New Listings]
    E -->|No| G[No Action]
    F --> H[Calculate Deal Scores]
    H --> I{Score > 85?}
    I -->|Yes| J[2 Properties Qualify]
    I -->|No| K[Log for Review]
    J --> L[Auto Skip Trace]
    L --> M[Add to Priority Campaign]
    M --> N[Send Notification to User]

    style A fill:#9c27b0
    style F fill:#ff9800
    style M fill:#4caf50
    style N fill:#f44336
```

## 💡 Business Value

### For Real Estate Investors:

**Time Savings:**
- Automated daily property monitoring
- One-click skip trace (vs. manual lookup)
- Bulk export and campaign integration
- Smart filtering reduces noise

**Better Targeting:**
- REI 8020 deal scoring identifies best opportunities
- Multiple distress signals for motivated sellers
- Equity analysis shows negotiation leverage
- Portfolio tracking finds active investors

**Competitive Advantage:**
- Off-market property discovery
- Daily automation catches new listings first
- Multi-dimensional filtering (60+ criteria)
- Contact data enrichment streamlines outreach

**ROI Optimization:**
- Focus on high-score deals (80-100 points)
- Avoid low-equity properties
- Target multiple distress signals
- Track investor activity for partnerships

## 🛠️ Technology Stack

```mermaid
graph LR
    subgraph Frontend
        A[Next.js 15.3.4]
        B[React 18]
        C[TypeScript]
        D[Tailwind CSS]
        E[Shadcn UI]
    end

    subgraph Backend
        F[NestJS]
        G[Node.js]
        H[TypeScript]
        I[Zod Validation]
    end

    subgraph Database
        J[PostgreSQL]
        K[Prisma ORM]
    end

    subgraph External
        L[RealEstate API]
        M[Skip Trace API]
        N[DigitalOcean Spaces]
    end

    Frontend --> Backend
    Backend --> Database
    Backend --> External

    style Frontend fill:#61dafb
    style Backend fill:#ea2845
    style Database fill:#336791
    style External fill:#ff9800
```

## 🔮 Future Enhancements

1. **Full Interactive Map**
   - Mapbox/Google Maps integration
   - Property clustering by deal score
   - Heat maps for deal density
   - Draw custom search areas

2. **AI-Powered Insights**
   - PropGPT: Natural language property search
   - Predictive analytics for property values
   - Market trend analysis
   - Automated lead scoring refinement

3. **Advanced Automation**
   - Webhook triggers for new properties
   - Automatic campaign creation
   - Smart follow-up sequences
   - Integration with CRM systems

4. **Enhanced Analytics**
   - Portfolio performance tracking
   - Campaign ROI metrics
   - Market comparison reports
   - Deal velocity tracking

5. **Collaboration Features**
   - Team workspaces
   - Shared saved searches
   - Property notes and tagging
   - Deal assignment workflow

---

## 📚 Quick Reference

### Access URLs:
- **Local Frontend:** http://localhost:3000
- **Local Backend:** http://localhost:4000
- **Production:** monkfish-app-mb7h3.ondigitalocean.app

### API Keys:
- **PropertySearch:** `NEXTIER-2906-74a1-8684-d2f63f473b7b`
- **SkipTrace:** `ELITEHOMEOWNERADVISORSSKIPPRODUCTION-8aae-7b54-9463-5db02217ffa5`

### Key Files:
- Frontend Explorer: `apps/front/src/features/property/components/realestate-api-explorer.tsx`
- Backend Controller: `apps/api/src/app/property/controllers/realestate-api.controller.ts`
- Backend Service: `apps/api/src/app/property/services/real-estate.service.ts`
- Automation Service: `apps/api/src/app/property/services/saved-search-automation.service.ts`

---

**Document Version:** 1.0
**Last Updated:** November 22, 2025
**Status:** Active Development
**Environment:** Local + DigitalOcean Cloud

# OutreachGlobal × SignalHouse.io Integration

> **Enterprise SMS Infrastructure for Scalable Lead Generation**

---

## Platform Overview

OutreachGlobal is a multi-tenant lead generation platform that uses SignalHouse.io as its core SMS infrastructure. We turn cold data into warm conversations at scale.

```mermaid
flowchart TB
    subgraph OUTREACH["OutreachGlobal Platform"]
        direction TB
        DATA[("Lead Data<br/>10M+ Records")]
        AI["AI Workers<br/>GIANNA | CATHY | SABRINA"]
        DASH["Analytics Dashboard"]
    end

    subgraph SIGNAL["SignalHouse.io Infrastructure"]
        direction TB
        API["SignalHouse API"]
        BRAND["10DLC Brands"]
        CAMP["Campaigns"]
        NUMS["Phone Numbers"]
        DELIVERY["Message Delivery"]
    end

    subgraph OUTCOMES["Business Outcomes"]
        direction TB
        REPLIES["Inbound Replies"]
        EMAILS["Email Captures"]
        CALLS["Booked Calls"]
        DEALS["Closed Deals"]
    end

    DATA --> AI
    AI --> API
    API --> BRAND
    API --> CAMP
    API --> NUMS
    BRAND --> DELIVERY
    CAMP --> DELIVERY
    NUMS --> DELIVERY
    DELIVERY --> REPLIES
    REPLIES --> EMAILS
    EMAILS --> CALLS
    CALLS --> DEALS
    REPLIES -.-> AI

    style SIGNAL fill:#4F46E5,color:#fff
    style OUTREACH fill:#059669,color:#fff
    style OUTCOMES fill:#D97706,color:#fff
```

---

## The Numbers Game

Our philosophy: **Volume × Quality × Persistence = Results**

```mermaid
flowchart LR
    subgraph VOLUME["VOLUME"]
        V1["10,000 SMS/day"]
    end

    subgraph FUNNEL["CONVERSION FUNNEL"]
        F1["500 Replies<br/>(5%)"]
        F2["150 Emails Captured<br/>(30% of replies)"]
        F3["50 Calls Booked<br/>(33% of emails)"]
        F4["10-15 Deals<br/>(20-30% close rate)"]
    end

    V1 --> F1 --> F2 --> F3 --> F4

    style VOLUME fill:#3B82F6,color:#fff
    style FUNNEL fill:#10B981,color:#fff
```

---

## Multi-Tenant Architecture

Each client organization maps to SignalHouse sub-groups for complete isolation:

```mermaid
flowchart TB
    subgraph SH["SignalHouse Account"]
        MASTER["Master Brand<br/>(10DLC Registered)"]

        subgraph SUBS["Sub-Groups (Tenants)"]
            T1["Tenant A<br/>Real Estate"]
            T2["Tenant B<br/>Insurance"]
            T3["Tenant C<br/>Solar"]
            T4["Tenant D<br/>Home Services"]
        end

        subgraph POOLS["Phone Number Pools"]
            P1["Pool A<br/>25 numbers"]
            P2["Pool B<br/>15 numbers"]
            P3["Pool C<br/>30 numbers"]
            P4["Pool D<br/>20 numbers"]
        end
    end

    MASTER --> SUBS
    T1 --> P1
    T2 --> P2
    T3 --> P3
    T4 --> P4

    style SH fill:#4F46E5,color:#fff
    style MASTER fill:#7C3AED,color:#fff
```

**Scaling Reality:**
| Tenants | Phone Numbers | Daily Capacity |
|---------|---------------|----------------|
| 10 | 200 | 400,000 SMS |
| 50 | 1,000 | 2,000,000 SMS |
| 100 | 2,000 | 4,000,000 SMS |

---

## AI Worker Pipeline

Three AI personalities handle different stages of the conversation:

```mermaid
flowchart LR
    subgraph WORKERS["AI Workers (Each with dedicated phone numbers)"]
        direction TB
        G["🎯 GIANNA<br/>The Opener<br/>Initial contact<br/>Email capture"]
        C["🔄 CATHY<br/>The Nudger<br/>Follow-ups<br/>Re-engagement"]
        S["📅 SABRINA<br/>The Closer<br/>Book calls<br/>Strategy sessions"]
    end

    COLD["Cold Lead"] --> G
    G -->|"No response"| C
    G -->|"Interested"| S
    C -->|"Re-engaged"| S
    S --> BOOKED["Call Booked"]

    style G fill:#EC4899,color:#fff
    style C fill:#F59E0B,color:#fff
    style S fill:#10B981,color:#fff
```

---

## Message Flow Architecture

```mermaid
sequenceDiagram
    participant L as Lead
    participant SH as SignalHouse API
    participant WH as Webhook Handler
    participant AI as AI Worker
    participant DB as Database

    Note over AI,SH: OUTBOUND FLOW
    AI->>SH: POST /message/sendSMS
    SH->>L: SMS Delivered
    SH->>WH: Webhook: message.delivered
    WH->>DB: Update status

    Note over L,DB: INBOUND FLOW
    L->>SH: Reply SMS
    SH->>WH: Webhook: message.received
    WH->>DB: Store message
    WH->>AI: Route to worker
    AI->>AI: Classify response
    AI->>SH: Auto-reply if applicable
    SH->>L: Response delivered
```

---

## SignalHouse API Usage

### Endpoints We Use

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Messaging** | `/message/sendSMS`, `/message/sendMMS` | Core sending |
| **Numbers** | `/phoneNumber/buyPhoneNumber`, `/phoneNumber/myPhoneNumbers` | Number provisioning |
| **Brands** | `/brand/nonBlocking`, `/brand/basicBrandDetails` | 10DLC registration |
| **Campaigns** | `/campaign/storeForReview`, `/campaign/details` | Campaign management |
| **Analytics** | `/analytics/dashboardAnalytics`, `/analytics/analyticsOutbound` | Reporting |
| **Webhooks** | Inbound to our `/api/webhook/signalhouse` | Event handling |
| **Sub-Groups** | `/user/subGroup/create`, `/user/subGroup/get` | Multi-tenant isolation |

### Request Volume (Projected)

```mermaid
xychart-beta
    title "Daily API Requests by Category"
    x-axis ["Send SMS", "Webhooks", "Analytics", "Numbers", "Campaigns"]
    y-axis "Requests" 0 --> 50000
    bar [45000, 35000, 5000, 500, 100]
```

---

## Webhook Events We Handle

```mermaid
flowchart TB
    subgraph EVENTS["SignalHouse Webhook Events"]
        direction LR
        E1["message.received"]
        E2["message.delivered"]
        E3["message.failed"]
        E4["brand.add"]
        E5["campaign.add"]
        E6["number.provisioned"]
    end

    subgraph ACTIONS["Platform Actions"]
        direction LR
        A1["AI Response<br/>Email Capture<br/>Opt-Out"]
        A2["Update Status<br/>Analytics"]
        A3["Retry Logic<br/>Alerts"]
        A4["Sync Brands"]
        A5["Enable Sending"]
        A6["Assign to Pool"]
    end

    E1 --> A1
    E2 --> A2
    E3 --> A3
    E4 --> A4
    E5 --> A5
    E6 --> A6

    style EVENTS fill:#4F46E5,color:#fff
    style ACTIONS fill:#059669,color:#fff
```

---

## 2-Bracket Conversation Flows

### Flow A: Email Capture

```mermaid
sequenceDiagram
    participant G as GIANNA
    participant L as Lead
    participant S as System

    G->>L: "Best email to send the valuation report for 123 Main St?"
    L->>G: "john@email.com"
    Note right of G: Email extracted automatically
    G->>L: "Perfect John! Sending that over shortly - Gianna"
    S->>S: Lead tagged: GOLD LABEL (email + mobile)
    S->>S: Queue email delivery
    S->>S: Schedule 24h SABRINA follow-up
```

### Flow B: Content Permission

```mermaid
sequenceDiagram
    participant G as GIANNA
    participant L as Lead
    participant S as System

    G->>L: "Can I send you a link to the article I wrote?"
    L->>G: "Sure" / "Yes" / "Send it"
    Note right of G: Permission detected
    G->>L: "Great! Here it is: [link] - Gianna"
    S->>S: Lead tagged: content_delivered
    S->>S: Schedule 24h email capture follow-up
```

---

## Lead Scoring System

```mermaid
flowchart TB
    subgraph SCORING["Lead Priority Scoring"]
        GREEN["🟢 GREEN<br/>Responded to SMS<br/>3x Priority<br/>CALL IMMEDIATELY"]
        GOLD["🥇 GOLD<br/>Email + Mobile Captured<br/>100% Score<br/>High Contactability"]
        STANDARD["⚪ STANDARD<br/>Initial Contact<br/>1x Priority<br/>Normal Queue"]
    end

    INBOUND["Inbound Reply"] --> GREEN
    EMAIL["Email Captured"] --> GOLD
    MOBILE["SMS Received From"] --> GOLD
    IMPORT["List Import"] --> STANDARD

    style GREEN fill:#22C55E,color:#fff
    style GOLD fill:#EAB308,color:#000
    style STANDARD fill:#6B7280,color:#fff
```

---

## Platform Statistics

| Metric | Current | Growth Target |
|--------|---------|---------------|
| Active Tenants | 10 | 100 |
| Phone Numbers | 150 | 2,000 |
| Daily SMS Volume | 50,000 | 2,000,000 |
| Response Rate | 4.8% | 6%+ |
| Email Capture Rate | 28% | 35%+ |

---

## Technical Integration

### Environment Configuration

```
SIGNALHOUSE_API_KEY=sk_live_...
SIGNALHOUSE_AUTH_TOKEN=at_...
SIGNALHOUSE_WEBHOOK_TOKEN=whsec_...
```

### Webhook URL

```
https://app.outreachglobal.io/api/webhook/signalhouse?token=SECURE_TOKEN
```

### Key Features Used

- ✅ SMS/MMS Sending
- ✅ 10DLC Brand Registration
- ✅ Campaign Management
- ✅ Phone Number Provisioning
- ✅ Sub-Group Multi-Tenancy
- ✅ Webhook Event Handling
- ✅ Opt-Out Management
- ✅ Analytics & Reporting
- ✅ Short Links
- ✅ Message Templates

---

## Contact

**OutreachGlobal Platform**
- Production: `app.outreachglobal.io`
- Admin: `admin@outreachglobal.io`

---

*This integration leverages SignalHouse.io's enterprise SMS infrastructure to power scalable, compliant lead generation across multiple industries.*

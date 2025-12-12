# SignalHouse SMS Platform Overview

A non-technical guide to understanding SMS messaging in OutreachGlobal.

---

## What is SignalHouse?

SignalHouse is our **SMS/text messaging provider** - the service that lets OutreachGlobal send and receive text messages to leads and property owners.

```mermaid
graph LR
    subgraph OutreachGlobal
        APP[Your Dashboard]
    end

    subgraph SignalHouse
        SMS[SMS Gateway]
    end

    subgraph Recipients
        PHONE[Lead's Phone]
    end

    APP -->|Send Message| SMS
    SMS -->|Deliver| PHONE
    PHONE -->|Reply| SMS
    SMS -->|Forward Reply| APP
```

---

## How SMS Messaging Works

```mermaid
sequenceDiagram
    participant You as You (Agent)
    participant OG as OutreachGlobal
    participant SH as SignalHouse
    participant Lead as Lead's Phone

    You->>OG: Click "Send SMS"
    OG->>SH: Forward message request
    SH->>Lead: Deliver text message
    Lead-->>SH: Lead replies "YES"
    SH-->>OG: Webhook notification
    OG-->>You: Show reply in Inbox
```

---

## The Complete SMS Flow

```mermaid
flowchart TD
    subgraph Step1[" 1. SETUP "]
        A[Create SignalHouse Account] --> B[Add Funds to Wallet]
        B --> C[Register Your Brand]
        C --> D[Create Campaign]
        D --> E[Buy Phone Numbers]
    end

    subgraph Step2[" 2. CONFIGURE "]
        E --> F[Attach Numbers to Campaign]
        F --> G[Set Up Webhooks]
        G --> H[Connect to OutreachGlobal]
    end

    subgraph Step3[" 3. SEND "]
        H --> I[Import Leads]
        I --> J[Create Message Templates]
        J --> K[Send SMS Campaign]
    end

    subgraph Step4[" 4. TRACK "]
        K --> L[Monitor Delivery]
        L --> M[Handle Replies]
        M --> N[Track Opt-Outs]
    end

    Step1 --> Step2 --> Step3 --> Step4
```

---

## What is 10DLC?

**10DLC** (10-Digit Long Code) is a **compliance requirement** for business text messaging in the US.

```mermaid
graph TD
    subgraph Before10DLC["Without 10DLC"]
        B1[Your Messages] -->|Filtered| B2[Carrier Block]
        B2 -->|Blocked| B3[Never Delivered]
    end

    subgraph After10DLC["With 10DLC"]
        A1[Your Messages] -->|Verified| A2[Carrier Approved]
        A2 -->|Delivered| A3[Lead's Phone]
    end

    style Before10DLC fill:#ffcccc
    style After10DLC fill:#ccffcc
```

### Why You Need 10DLC

| Without 10DLC | With 10DLC |
|---------------|------------|
| Messages blocked by carriers | Messages delivered reliably |
| 1 message per second | 60+ messages per second |
| High spam filtering | Trusted sender status |
| Potential fines | Full compliance |

---

## Message Types

```mermaid
graph LR
    subgraph Outbound["Messages You Send"]
        O1[Initial Outreach]
        O2[Follow-ups]
        O3[Appointment Reminders]
    end

    subgraph Inbound["Replies You Receive"]
        I1[YES - Interested]
        I2[NO - Not Interested]
        I3[STOP - Opt Out]
    end

    O1 --> I1
    O1 --> I2
    O1 --> I3
```

---

## Automatic Response Handling

OutreachGlobal automatically processes incoming messages:

```mermaid
flowchart TD
    MSG[Incoming Message] --> PARSE[Analyze Content]

    PARSE -->|Contains YES, INTERESTED, CALL| HOT[🔥 Mark as Hot Lead]
    PARSE -->|Contains STOP, UNSUBSCRIBE| OPT[🚫 Auto Opt-Out]
    PARSE -->|Contains HELP| HELP[ℹ️ Send Help Info]
    PARSE -->|Other Response| INBOX[📥 Add to Inbox]

    HOT --> NOTIFY[Notify Agent]
    OPT --> REMOVE[Remove from Queue]
    HELP --> AUTO[Send Auto-Reply]
    INBOX --> REVIEW[Ready for Review]
```

---

## Cost Structure

```mermaid
pie title Monthly SMS Costs (Example: 5,000 messages)
    "SMS Sending ($50)" : 50
    "Phone Numbers ($6)" : 6
    "10DLC Brand ($4)" : 4
    "Platform Fee ($0)" : 0
```

### Pricing Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Outbound SMS | $0.01/message | Per 160 characters |
| Inbound SMS | $0.005/message | Replies are cheaper |
| Phone Number | $2/month | Local area codes |
| 10DLC Brand | $4/month | One-time setup |
| 10DLC Campaign | $10 one-time | Per campaign |

**Example:** 5,000 messages/month = ~$60 total

---

## Dashboard Overview

```mermaid
graph TD
    subgraph Dashboard["SignalHouse Dashboard"]
        subgraph Analytics["📊 Analytics"]
            A1[Messages Sent]
            A2[Delivery Rate]
            A3[Response Rate]
        end

        subgraph Wallet["💰 Wallet"]
            W1[Current Balance]
            W2[Usage History]
            W3[Add Funds]
        end

        subgraph Numbers["📱 Phone Numbers"]
            N1[Your Numbers]
            N2[Buy New]
            N3[Configure]
        end

        subgraph Compliance["✅ 10DLC"]
            C1[Brand Status]
            C2[Campaign Status]
            C3[Throughput]
        end
    end
```

---

## Message Delivery Status

```mermaid
stateDiagram-v2
    [*] --> Queued: Message Created
    Queued --> Sent: Sent to Carrier
    Sent --> Delivered: Confirmed Delivery
    Sent --> Failed: Delivery Failed

    Delivered --> [*]: Success ✅
    Failed --> Retry: Auto Retry
    Retry --> Sent: Try Again
    Retry --> Error: Max Retries
    Error --> [*]: Failed ❌
```

---

## Campaign Workflow

```mermaid
flowchart LR
    subgraph Day0["Day 0"]
        D0[Initial Message]
    end

    subgraph Day3["Day 3"]
        D3[Follow-up #1]
    end

    subgraph Day7["Day 7"]
        D7[Follow-up #2]
    end

    subgraph Day14["Day 14"]
        D14[Final Attempt]
    end

    D0 -->|No Response| D3
    D3 -->|No Response| D7
    D7 -->|No Response| D14

    D0 -->|Reply| CONV[Conversation]
    D3 -->|Reply| CONV
    D7 -->|Reply| CONV
    D14 -->|Reply| CONV

    D0 -->|STOP| OPT[Opted Out]
    D3 -->|STOP| OPT
    D7 -->|STOP| OPT
    D14 -->|STOP| OPT
```

---

## Integration Architecture

```mermaid
graph TB
    subgraph OutreachGlobal["OutreachGlobal Platform"]
        UI[Web Dashboard]
        API[API Server]
        DB[(Database)]
        QUEUE[SMS Queue]
    end

    subgraph SignalHouse["SignalHouse"]
        GW[SMS Gateway]
        WH[Webhooks]
    end

    subgraph Carriers["Mobile Carriers"]
        ATT[AT&T]
        VZ[Verizon]
        TMO[T-Mobile]
    end

    subgraph Leads["Recipients"]
        PH1[Lead Phone 1]
        PH2[Lead Phone 2]
        PH3[Lead Phone 3]
    end

    UI -->|Send Request| API
    API -->|Queue Message| QUEUE
    QUEUE -->|Send| GW
    GW -->|Deliver| ATT & VZ & TMO
    ATT & VZ & TMO -->|To Phone| PH1 & PH2 & PH3

    PH1 & PH2 & PH3 -->|Reply| ATT & VZ & TMO
    ATT & VZ & TMO -->|Forward| GW
    GW -->|Webhook| WH
    WH -->|Notify| API
    API -->|Store| DB
    DB -->|Display| UI
```

---

## Key Features at a Glance

```mermaid
mindmap
    root((SignalHouse SMS))
        Sending
            Single SMS
            Bulk Campaigns
            Scheduled Messages
            Templates
        Receiving
            Two-Way Chat
            Auto-Responses
            Lead Detection
            Opt-Out Handling
        Compliance
            10DLC Registration
            Brand Verification
            Campaign Approval
            Carrier Trust
        Analytics
            Delivery Tracking
            Response Rates
            Cost Monitoring
            Conversation History
```

---

## Quick Start Checklist

```mermaid
graph TD
    subgraph Setup["✅ Setup Tasks"]
        S1[Create Account] --> S2[Add $100 to Wallet]
        S2 --> S3[Submit Brand Registration]
        S3 --> S4[Wait for Approval 1-3 days]
        S4 --> S5[Create Campaign]
        S5 --> S6[Wait for Approval 1-5 days]
    end

    subgraph Config["⚙️ Configuration"]
        S6 --> C1[Buy Phone Number]
        C1 --> C2[Attach to Campaign]
        C2 --> C3[Configure Webhooks]
        C3 --> C4[Test Connection]
    end

    subgraph Launch["🚀 Go Live"]
        C4 --> L1[Import Leads]
        L1 --> L2[Create Templates]
        L2 --> L3[Send First Campaign]
        L3 --> L4[Monitor Results]
    end
```

---

## Support & Resources

| Resource | Link |
|----------|------|
| SignalHouse Dashboard | https://app.signalhouse.io |
| API Documentation | https://app.signalhouse.io/apidoc |
| Support Email | support@signalhouse.io |
| Status Page | https://status.signalhouse.io |

---

## Glossary

| Term | Definition |
|------|------------|
| **SMS** | Short Message Service - text messages |
| **MMS** | Multimedia Message Service - texts with images |
| **10DLC** | 10-Digit Long Code - business texting compliance |
| **A2P** | Application-to-Person messaging |
| **Webhook** | Automatic notification when something happens |
| **Opt-Out** | When someone texts STOP to unsubscribe |
| **Throughput** | How many messages can be sent per minute |
| **Segment** | 160 characters = 1 SMS segment |

---

*For technical implementation details, see [SIGNALHOUSE_ONBOARDING.md](./SIGNALHOUSE_ONBOARDING.md)*

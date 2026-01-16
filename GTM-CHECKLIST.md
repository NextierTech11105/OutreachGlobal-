# NEXTIER GTM CHECKLIST
## Homeowner Advisors - Launch Requirements

---

## MUST HAVES (Cannot Launch Without)

### 1. Lead Data Input
| Item | Status | Action |
|------|--------|--------|
| CSV upload for leads | ✅ READY | - |
| Skip trace (get phones/emails) | ✅ WORKING | Using RealEstateAPI fallback |
| Entity filter (reject LLCs) | ✅ READY | - |

### 2. SMS Outbound (GIANNA)
| Item | Status | Action |
|------|--------|--------|
| SignalHouse API connected | ✅ READY | - |
| GIANNA phone number active | ✅ READY | +15164079249 |
| 10DLC campaign registered | ✅ READY | CJRCU60 |
| Send SMS from platform | ✅ READY | - |
| SMS templates loaded | ✅ READY | 8 templates |

### 3. SMS Inbound (Responses)
| Item | Status | Action |
|------|--------|--------|
| Webhook receiving messages | ✅ READY | - |
| Response classification | ✅ READY | - |
| Opt-out (STOP) handling | ✅ READY | - |
| Conversation view | ✅ READY | /sms-conversations |

### 4. Call Hot Leads
| Item | Status | Action |
|------|--------|--------|
| Click-to-call working | ✅ READY | Twilio |
| Twilio phone number | ✅ READY | +16312123195 |
| Lead detail page | ✅ READY | - |

### 5. Lead Management
| Item | Status | Action |
|------|--------|--------|
| View all leads | ✅ READY | - |
| Lead status updates | ✅ READY | - |
| Hot lead queue | ✅ READY | - |

### 6. AI Orchestration (CRITICAL)

| Item | Status | Action |
|------|--------|--------|
| Response Classification | ✅ READY | 11+ response types |
| Classification → Call Queue | ✅ READY | Hot leads auto-routed |
| Priority Scoring | ✅ READY | GREEN=3x, GOLD=2x boost |
| Worker Assignment | ✅ READY | GIANNA/CATHY/SABRINA routing |
| Email Capture Flow | ✅ READY | Value X delivery pipeline |
| GREEN Tag (responded) | ✅ READY | 3x priority for responders |
| GOLD Label (email+mobile) | ✅ READY | 100% Lead Score |
| NEVA Research Trigger | ✅ READY | Pre-call intel |

---

## MUST HAVES STATUS: ✅ ALL READY
**You can launch now and start making money.**

---

## NICE TO HAVES (Improve ROI / UX)

### Cost Optimization
| Item | Status | Impact | Action |
|------|--------|--------|--------|
| Tracerfy API ($0.02/lead) | ⏳ WAITING | Save $80-230 per 1K leads | Email sales@tracerfy.com |

### Additional Workers
| Item | Status | Impact | Action |
|------|--------|--------|--------|
| CATHY phone number | ⏳ NEED | Separate nudger identity | Buy from SignalHouse |
| SABRINA phone number | ⏳ NEED | Separate closer identity | Buy from SignalHouse |

### Enhanced Features
| Item | Status | Impact | Action |
|------|--------|--------|--------|
| Power dialer | ❌ BROKEN | Faster calling | Fix or use click-to-call |
| Redis caching | ⏳ OPTIONAL | Better performance | Already using Upstash |
| Call recording | ⚠️ CHECK | Training/compliance | Verify Twilio config |

### Automation
| Item | Status | Impact | Action |
|------|--------|--------|--------|
| Scheduled campaigns | ⚠️ VERIFY | Hands-off sending | Test scheduler |
| Auto-follow-up | ✅ READY | CATHY nudges | Works when enabled |

---

## LAUNCH ORDER

### Day 1 (NOW):
1. ✅ Test send SMS from Command Center
2. ✅ Verify response appears in Conversations
3. ✅ Test click-to-call
4. ✅ Upload 50 test leads, run mini campaign

### Day 2-3:
1. Get Tracerfy API token (save money)
2. Buy CATHY + SABRINA numbers ($2/mo)
3. Run 500-lead campaign

### Week 2+:
1. Fix power dialer (optional)
2. Scale to 2,000 leads/day

---

## REVENUE MATH

```
1,000 leads uploaded
    ↓
Skip trace: $100 (RealEstateAPI) or $20 (Tracerfy)
SMS send: $20
    ↓
5% response rate = 50 responses
    ↓
20% qualified = 10 hot leads
    ↓
20% close rate = 2 deals
    ↓
@ $5,000-10,000 per deal = $10,000-20,000 revenue
```

**Cost: $120** → **Revenue: $10,000-20,000** → **ROI: 80-160x**

---

## IMMEDIATE ACTION (Right Now)

1. **Go to Command Center** → Send test SMS
2. **Check SMS Conversations** → See response
3. **Click phone icon** → Make test call
4. **If all works** → Upload real leads and GO

---

**BOTTOM LINE: You're ready. The Must Haves are done. Start sending.**

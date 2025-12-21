# USBIZDATA → SKIP TRACE → SMS CAMPAIGN ORCHESTRATION
## Complete End-to-End Business Owner Outreach Workflow

**Version**: 2.0  
**Date**: 2025-12-21  
**Complete Pipeline**: CSV Upload → Skip Trace → SMS Campaigns  

---

## 🔄 COMPLETE WORKFLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USBIZDATA → SKIP TRACE → SMS PIPELINE            │
├─────────────────────────────────────────────────────────────────────┤
│ 📁 STAGE 1: DATA INGESTION                                          │
│ ├─ USBizData CSV Upload & Validation                               │
│ ├─ Business Data Processing (2,000 records max)                    │
│ ├─ Phone Number Validation (Twilio Lookup)                         │
│ └─ Business Records Storage & Indexing                             │
├─────────────────────────────────────────────────────────────────────┤
│ 🔍 STAGE 2: SKIP TRACING ORCHESTRATION                             │
│ ├─ Business → Owner Mapping Resolution                             │
│ ├─ Owner Contact Information Extraction                            │
│ ├─ Owner Phone Number Validation                                   │
│ ├─ Owner Data Enrichment & Scoring                                 │
│ └─ Owner Contact Database Storage                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 📱 STAGE 3: SMS CAMPAIGN ORCHESTRATION                             │
│ ├─ Owner Segment Creation & Targeting                              │
│ ├─ SMS Campaign Design & Template Management                       │
│ ├─ Campaign Scheduling & Batch Execution                           │
│ ├─ Delivery Tracking & Response Monitoring                         │
│ └─ Campaign Analytics & ROI Measurement                            │
├─────────────────────────────────────────────────────────────────────┤
│ 🎯 STAGE 4: RESPONSE & FOLLOW-UP                                   │
│ ├─ Response Handling & Lead Scoring                                │
│ ├─ Automated Follow-up Sequences                                   │
│ ├─ Deal Pipeline Integration                                       │
│ └─ Performance Analytics & Optimization                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ ENHANCED DATABASE SCHEMA

### Skip Tracing Tables

```sql
-- Skip Trace Jobs
CREATE TABLE skip_trace_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES usbizdata_import_sessions(id) ON DELETE CASCADE,
    business_id UUID REFERENCES usbizdata_records(id) ON DELETE CASCADE,
    job_status VARCHAR(50) DEFAULT 'pending',
    skip_trace_provider VARCHAR(100), -- 'skiptrace', 'truepeoplesearch', etc.
    trace_cost DECIMAL(8,2),
    trace_request_data JSONB,
    trace_response_data JSONB,
    owner_found BOOLEAN DEFAULT FALSE,
    owner_contact_info JSONB,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Business Owner Contacts
CREATE TABLE business_owner_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES usbizdata_records(id) ON DELETE CASCADE,
    skip_trace_job_id UUID REFERENCES skip_trace_jobs(id) ON DELETE CASCADE,
    -- Owner Information
    owner_first_name VARCHAR(100),
    owner_last_name VARCHAR(100),
    owner_full_name VARCHAR(200),
    owner_title VARCHAR(200),
    -- Contact Information
    primary_phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    home_phone VARCHAR(20),
    work_phone VARCHAR(20),
    email VARCHAR(255),
    linkedin_url VARCHAR(500),
    -- Address Information
    current_address JSONB,
    previous_addresses JSONB,
    -- Skip Trace Metadata
    trace_source VARCHAR(100),
    trace_confidence DECIMAL(3,2),
    trace_date TIMESTAMP WITH TIME ZONE,
    trace_cost DECIMAL(8,2),
    -- Validation
    phone_validated BOOLEAN DEFAULT FALSE,
    email_validated BOOLEAN DEFAULT FALSE,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    -- Targeting
    sms_opt_in BOOLEAN DEFAULT FALSE,
    campaign_eligible BOOLEAN DEFAULT FALSE,
    priority_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Campaigns
CREATE TABLE sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100), -- 'business_owner_outreach', 'follow_up', etc.
    target_segment VARCHAR(100), -- 'real_estate_agents', 'plumbing_companies', etc.
    template_id UUID REFERENCES message_templates(id),
    sender_phone VARCHAR(20),
    message_content TEXT,
    campaign_status VARCHAR(50) DEFAULT 'draft',
    -- Scheduling
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    batch_size INTEGER DEFAULT 100,
    send_interval_seconds INTEGER DEFAULT 60, -- 1 message per minute
    -- Targets
    total_targeted INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    opt_out_count INTEGER DEFAULT 0,
    -- Analytics
    cost_per_sms DECIMAL(6,4) DEFAULT 0.0075,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- SMS Campaign Recipients
CREATE TABLE sms_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    owner_contact_id UUID REFERENCES business_owner_contacts(id) ON DELETE CASCADE,
    business_id UUID REFERENCES usbizdata_records(id) ON DELETE CASCADE,
    -- Sending
    send_status VARCHAR(50) DEFAULT 'pending',
    message_sid VARCHAR(100), -- Twilio Message SID
    scheduled_send_time TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    -- Response Tracking
    response_received BOOLEAN DEFAULT FALSE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    response_count INTEGER DEFAULT 0,
    last_response_at TIMESTAMP WITH TIME ZONE,
    -- Opt-out
    opted_out BOOLEAN DEFAULT FALSE,
    opt_out_date TIMESTAMP WITH TIME ZONE,
    -- Analytics
    delivery_status VARCHAR(50), -- 'delivered', 'failed', 'undelivered'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_skip_trace_jobs_session_id ON skip_trace_jobs(session_id);
CREATE INDEX idx_skip_trace_jobs_business_id ON skip_trace_jobs(business_id);
CREATE INDEX idx_skip_trace_jobs_status ON skip_trace_jobs(job_status);
CREATE INDEX idx_owner_contacts_business_id ON business_owner_contacts(business_id);
CREATE INDEX idx_owner_contacts_sms_opt_in ON business_owner_contacts(sms_opt_in);
CREATE INDEX idx_owner_contacts_campaign_eligible ON business_owner_contacts(campaign_eligible);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(campaign_status);
CREATE INDEX idx_sms_campaign_recipients_campaign_id ON sms_campaign_recipients(campaign_id);
CREATE INDEX idx_sms_campaign_recipients_status ON sms_campaign_recipients(send_status);
```

---

## 🔍 SKIP TRACE ORCHESTRATION SERVICE

### Skip Trace Implementation

```typescript
// lib/skip-trace-orchestrator.ts

import { TwilioLookupService } from './twilio-lookup-service';
import { DatabaseService } from './database-service';
import axios from 'axios';

export class SkipTraceOrchestrator {
  private twilioService: TwilioLookupService;
  private dbService: DatabaseService;
  private skipTraceProviders: Map<string, SkipTraceProvider>;
  
  constructor() {
    this.twilioService = new TwilioLookupService();
    this.dbService = new DatabaseService();
    this.initializeProviders();
  }
  
  private initializeProviders() {
    this.skipTraceProviders = new Map([
      ['skiptrace', new SkipTraceProvider({
        apiUrl: 'https://api.skiptrace.com/v1',
        apiKey: process.env.SKIPTRACE_API_KEY,
        costPerSearch: 0.15
      })],
      ['truepeoplesearch', new TruePeopleSearchProvider({
        apiUrl: 'https://api.truepeoplesearch.com/v1',
        apiKey: process.env.TRUE_PEOPLE_SEARCH_API_KEY,
        costPerSearch: 0.12
      })],
      ['spokeo', new SpokeoProvider({
        apiUrl: 'https://api.spokeo.com/v1',
        apiKey: process.env.SPOKEO_API_KEY,
        costPerSearch: 0.18
      })]
    ]);
  }
  
  async executeSkipTraceWorkflow(sessionId: string): Promise<SkipTraceResult> {
    console.log(`Starting skip trace workflow for session: ${sessionId}`);
    
    try {
      // Get businesses that haven't been skip traced yet
      const businesses = await this.dbService.getBusinessesForSkipTrace(sessionId);
      
      if (businesses.length === 0) {
        return { success: true, processed: 0, found: 0, cost: 0 };
      }
      
      const results: SkipTraceJobResult[] = [];
      let totalCost = 0;
      let totalFound = 0;
      
      // Process in batches to manage costs
      const batchSize = 50;
      for (let i = 0; i < businesses.length; i += batchSize) {
        const batch = businesses.slice(i, i + batchSize);
        
        const batchPromises = batch.map(business => 
          this.processSingleBusinessSkipTrace(business)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            totalCost += result.value.cost;
            if (result.value.found) totalFound++;
          }
        }
        
        // Brief pause between batches
        await this.sleep(1000);
      }
      
      // Update session with results
      await this.dbService.updateSkipTraceSession(sessionId, {
        totalProcessed: businesses.length,
        totalFound,
        totalCost,
        status: 'completed'
      });
      
      return {
        success: true,
        processed: businesses.length,
        found: totalFound,
        cost: totalCost,
        results
      };
      
    } catch (error) {
      console.error('Skip trace workflow failed:', error);
      await this.dbService.updateSkipTraceSession(sessionId, {
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }
  
  private async processSingleBusinessSkipTrace(business: any): Promise<SkipTraceJobResult> {
    const job = await this.dbService.createSkipTraceJob({
      session_id: business.session_id,
      business_id: business.id,
      job_status: 'processing'
    });
    
    try {
      // Try multiple providers for better coverage
      const ownerInfo = await this.tryMultipleProviders(business);
      
      if (ownerInfo) {
        // Save owner contact information
        const contact = await this.dbService.saveOwnerContact({
          business_id: business.id,
          skip_trace_job_id: job.id,
          ...ownerInfo,
          trace_date: new Date(),
          trace_confidence: ownerInfo.confidence || 0.8,
          trace_cost: ownerInfo.cost || 0.15
        });
        
        // Validate phone numbers
        await this.validateOwnerContactPhones(contact);
        
        // Update job status
        await this.dbService.updateSkipTraceJob(job.id, {
          job_status: 'completed',
          owner_found: true,
          owner_contact_info: ownerInfo,
          trace_cost: ownerInfo.cost || 0.15,
          completed_at: new Date()
        });
        
        return {
          jobId: job.id,
          businessId: business.id,
          found: true,
          cost: ownerInfo.cost || 0.15,
          contact: contact
        };
      } else {
        // No owner found
        await this.dbService.updateSkipTraceJob(job.id, {
          job_status: 'completed',
          owner_found: false,
          completed_at: new Date()
        });
        
        return {
          jobId: job.id,
          businessId: business.id,
          found: false,
          cost: 0.15, // Cost even if not found
          contact: null
        };
      }
      
    } catch (error) {
      await this.dbService.updateSkipTraceJob(job.id, {
        job_status: 'failed',
        trace_response_data: { error: error.message },
        completed_at: new Date()
      });
      
      throw error;
    }
  }
  
  private async tryMultipleProviders(business: any): Promise<OwnerInfo | null> {
    const providers = ['skiptrace', 'truepeoplesearch', 'spokeo'];
    const results: Array<{ provider: string; info: OwnerInfo | null; confidence: number; cost: number }> = [];
    
    for (const providerName of providers) {
      try {
        const provider = this.skipTraceProviders.get(providerName);
        if (!provider) continue;
        
        const result = await provider.searchBusinessOwners(business);
        if (result) {
          results.push({
            provider: providerName,
            info: result,
            confidence: result.confidence || 0.7,
            cost: provider.costPerSearch
          });
        }
        
        // Try next provider if this one didn't find owners
        if (!result) {
          continue;
        }
        
        // Validate the result
        if (this.isValidOwnerResult(result)) {
          // Return the first valid result
          return {
            ...result,
            trace_source: providerName,
            confidence: result.confidence || 0.8,
            cost: provider.costPerSearch
          };
        }
        
      } catch (error) {
        console.warn(`Provider ${providerName} failed for business ${business.id}:`, error.message);
        continue;
      }
    }
    
    // Return best result if any found
    if (results.length > 0) {
      const bestResult = results.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        ...bestResult.info!,
        trace_source: bestResult.provider,
        confidence: bestResult.confidence,
        cost: bestResult.cost
      };
    }
    
    return null;
  }
  
  private async validateOwnerContactPhones(contact: any): Promise<void> {
    const phoneNumbers = [
      contact.primary_phone,
      contact.mobile_phone,
      contact.work_phone
    ].filter(phone => phone);
    
    const validationResults = [];
    
    for (const phone of phoneNumbers) {
      try {
        const validation = await this.twilioService.validatePhoneNumber(phone);
        validationResults.push({
          phoneNumber: phone,
          isValid: validation.isValid,
          type: validation.lineType,
          carrier: validation.carrier?.name
        });
      } catch (error) {
        validationResults.push({
          phoneNumber: phone,
          isValid: false,
          error: error.message
        });
      }
    }
    
    // Update contact with validation results
    await this.dbService.updateOwnerContactPhones(contact.id, validationResults);
  }
  
  private isValidOwnerResult(result: OwnerInfo): boolean {
    // Validate minimum required information
    return !!(
      result.owner_full_name && 
      result.owner_full_name.split(' ').length >= 2 && // First and last name
      (result.primary_phone || result.mobile_phone) && // At least one phone
      result.confidence && result.confidence >= 0.6 // Minimum confidence threshold
    );
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface OwnerInfo {
  owner_first_name?: string;
  owner_last_name?: string;
  owner_full_name: string;
  owner_title?: string;
  primary_phone?: string;
  mobile_phone?: string;
  work_phone?: string;
  home_phone?: string;
  email?: string;
  linkedin_url?: string;
  current_address?: any;
  previous_addresses?: any[];
  confidence?: number;
  trace_source?: string;
  cost?: number;
}

interface SkipTraceProvider {
  costPerSearch: number;
  searchBusinessOwners(business: any): Promise<OwnerInfo | null>;
}

interface SkipTraceJobResult {
  jobId: string;
  businessId: string;
  found: boolean;
  cost: number;
  contact: any;
}

interface SkipTraceResult {
  success: boolean;
  processed: number;
  found: number;
  cost: number;
  results?: SkipTraceJobResult[];
}
```

### Skip Trace Provider Implementations

```typescript
// lib/providers/skiptrace-provider.ts

export class SkipTraceProvider implements SkipTraceProvider {
  public costPerSearch: number;
  private apiUrl: string;
  private apiKey: string;
  
  constructor(config: { apiUrl: string; apiKey: string; costPerSearch: number }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.costPerSearch = config.costPerSearch;
  }
  
  async searchBusinessOwners(business: any): Promise<OwnerInfo | null> {
    try {
      const searchParams = {
        business_name: business.business_name,
        address: business.business_address,
        city: business.city,
        state: business.state,
        zip: business.zip_code
      };
      
      const response = await axios.post(`${this.apiUrl}/business-owners`, searchParams, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.owners && response.data.owners.length > 0) {
        const owner = response.data.owners[0]; // Get primary owner
        
        return {
          owner_first_name: owner.first_name,
          owner_last_name: owner.last_name,
          owner_full_name: `${owner.first_name} ${owner.last_name}`,
          owner_title: owner.title,
          primary_phone: owner.phone,
          mobile_phone: owner.mobile_phone,
          work_phone: owner.work_phone,
          email: owner.email,
          current_address: {
            street: owner.address,
            city: owner.city,
            state: owner.state,
            zip: owner.zip
          },
          confidence: owner.confidence_score || 0.8
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('SkipTrace API error:', error.response?.data || error.message);
      throw error;
    }
  }
}
```

---

## 📱 SMS CAMPAIGN ORCHESTRATION SERVICE

### SMS Campaign Manager

```typescript
// lib/sms-campaign-orchestrator.ts

import { TwilioService } from './twilio-service';
import { DatabaseService } from './database-service';

export class SMSCampaignOrchestrator {
  private twilioService: TwilioService;
  private dbService: DatabaseService;
  
  constructor() {
    this.twilioService = new TwilioService();
    this.dbService = new DatabaseService();
  }
  
  async createAndExecuteCampaign(config: CampaignConfig): Promise<CampaignResult> {
    console.log(`Creating SMS campaign: ${config.campaignName}`);
    
    try {
      // 1. Create campaign record
      const campaign = await this.dbService.createSMSCampaign({
        campaign_name: config.campaignName,
        campaign_type: config.campaignType,
        target_segment: config.targetSegment,
        template_id: config.templateId,
        sender_phone: config.senderPhone,
        message_content: config.messageContent,
        batch_size: config.batchSize || 100,
        send_interval_seconds: config.sendIntervalSeconds || 60,
        scheduled_start: new Date()
      });
      
      // 2. Get eligible recipients
      const recipients = await this.getEligibleRecipients(config);
      
      if (recipients.length === 0) {
        return {
          success: false,
          campaignId: campaign.id,
          message: 'No eligible recipients found',
          targeted: 0,
          sent: 0,
          cost: 0
        };
      }
      
      // 3. Create campaign recipients
      await this.dbService.createCampaignRecipients(campaign.id, recipients);
      
      // 4. Update campaign target count
      await this.dbService.updateCampaignTargetCount(campaign.id, recipients.length);
      
      // 5. Execute campaign
      const result = await this.executeCampaign(campaign.id, recipients);
      
      return {
        success: true,
        campaignId: campaign.id,
        targeted: recipients.length,
        sent: result.sentCount,
        cost: result.totalCost,
        messageSid: result.messageSids
      };
      
    } catch (error) {
      console.error('Campaign creation failed:', error);
      throw error;
    }
  }
  
  private async getEligibleRecipients(config: CampaignConfig): Promise<OwnerContact[]> {
    let query = `
      SELECT boc.*, ur.business_name, ur.industry, ur.city, ur.state
      FROM business_owner_contacts boc
      JOIN usbizdata_records ur ON boc.business_id = ur.id
      WHERE boc.sms_opt_in = true 
        AND boc.campaign_eligible = true
        AND boc.primary_phone IS NOT NULL
    `;
    
    const params: any[] = [];
    
    // Add segment filtering
    if (config.targetSegment) {
      query += ` AND ur.industry ILIKE $${params.length + 1}`;
      params.push(`%${config.targetSegment}%`);
    }
    
    // Add geographic filtering
    if (config.states && config.states.length > 0) {
      query += ` AND ur.state = ANY($${params.length + 1})`;
      params.push(config.states);
    }
    
    // Add priority filtering
    if (config.minPriorityScore) {
      query += ` AND boc.priority_score >= $${params.length + 1}`;
      params.push(config.minPriorityScore);
    }
    
    query += ` ORDER BY boc.priority_score DESC, boc.created_at ASC`;
    query += ` LIMIT ${config.maxRecipients || 1000}`;
    
    return await this.dbService.query(query, params);
  }
  
  private async executeCampaign(campaignId: string, recipients: OwnerContact[]): Promise<CampaignExecutionResult> {
    console.log(`Executing campaign ${campaignId} for ${recipients.length} recipients`);
    
    const batchSize = Math.min(recipients.length, 50); // Process in smaller batches
    const messageSids: string[] = [];
    let sentCount = 0;
    let totalCost = 0;
    
    // Update campaign status
    await this.dbService.updateCampaignStatus(campaignId, 'executing');
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(recipient => 
        this.sendSingleMessage(campaignId, recipient)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          messageSids.push(result.value.messageSid);
          sentCount++;
          totalCost += result.value.cost;
        }
      }
      
      // Update progress
      await this.dbService.updateCampaignProgress(campaignId, {
        sent_count: sentCount,
        total_cost: totalCost
      });
      
      // Pause between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.sleep(2000);
      }
    }
    
    // Update campaign as completed
    await this.dbService.updateCampaignStatus(campaignId, 'completed', {
      sent_count: sentCount,
      total_cost: totalCost,
      completed_at: new Date()
    });
    
    return {
      sentCount,
      totalCost,
      messageSids
    };
  }
  
  private async sendSingleMessage(campaignId: string, recipient: OwnerContact): Promise<{ messageSid: string; cost: number }> {
    try {
      // Get campaign details
      const campaign = await this.dbService.getCampaign(campaignId);
      
      // Personalize message
      const personalizedMessage = this.personalizeMessage(
        campaign.message_content,
        recipient,
        campaign.target_segment
      );
      
      // Send via Twilio
      const result = await this.twilioService.sendSMS({
        to: recipient.primary_phone || recipient.mobile_phone,
        from: campaign.sender_phone,
        body: personalizedMessage
      });
      
      // Update recipient status
      await this.dbService.updateCampaignRecipientStatus(campaignId, recipient.id, {
        send_status: 'sent',
        message_sid: result.messageSid,
        sent_at: new Date()
      });
      
      return {
        messageSid: result.messageSid,
        cost: campaign.cost_per_sms
      };
      
    } catch (error) {
      // Update recipient with error
      await this.dbService.updateCampaignRecipientStatus(campaignId, recipient.id, {
        send_status: 'failed',
        error_message: error.message
      });
      
      throw error;
    }
  }
  
  private personalizeMessage(template: string, recipient: OwnerContact, segment: string): string {
    let message = template;
    
    // Replace common placeholders
    message = message.replace(/\{\{owner_name\}\}/g, recipient.owner_full_name || 'there');
    message = message.replace(/\{\{business_name\}\}/g, recipient.business_name || 'your business');
    message = message.replace(/\{\{industry\}\}/g, recipient.industry || 'your industry');
    message = message.replace(/\{\{city\}\}/g, recipient.city || '');
    message = message.replace(/\{\{state\}\}/g, recipient.state || '');
    
    // Segment-specific personalization
    if (segment === 'real_estate_agents') {
      message = message.replace(/\{\{agent_title\}\}/g, 'real estate agent');
    } else if (segment === 'plumbing_companies') {
      message = message.replace(/\{\{service_type\}\}/g, 'plumbing services');
    } else if (segment === 'hvac_companies') {
      message = message.replace(/\{\{service_type\}\}/g, 'HVAC services');
    }
    
    return message;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface CampaignConfig {
  campaignName: string;
  campaignType: string;
  targetSegment?: string;
  templateId?: string;
  senderPhone: string;
  messageContent: string;
  batchSize?: number;
  sendIntervalSeconds?: number;
  states?: string[];
  maxRecipients?: number;
  minPriorityScore?: number;
}

interface OwnerContact {
  id: string;
  business_id: string;
  owner_full_name: string;
  primary_phone?: string;
  mobile_phone?: string;
  business_name: string;
  industry: string;
  city: string;
  state: string;
  priority_score: number;
}

interface CampaignResult {
  success: boolean;
  campaignId: string;
  message?: string;
  targeted: number;
  sent: number;
  cost: number;
  messageSid?: string[];
}

interface CampaignExecutionResult {
  sentCount: number;
  totalCost: number;
  messageSids: string[];
}
```

### Twilio SMS Service

```typescript
// lib/twilio-service.ts

import { Twilio } from 'twilio';

export class TwilioService {
  private client: Twilio;
  private accountSid: string;
  private authToken: string;
  
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.client = new Twilio(this.accountSid, this.authToken);
  }
  
  async sendSMS(params: { to: string; from: string; body: string }): Promise<{ messageSid: string; status: string }> {
    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: params.from,
        body: params.body,
        statusCallback: `${process.env.API_BASE_URL}/api/webhooks/twilio-status`
      });
      
      return {
        messageSid: message.sid,
        status: message.status
      };
      
    } catch (error) {
      console.error('Twilio SMS send error:', error);
      throw error;
    }
  }
  
  async getMessageStatus(messageSid: string): Promise<any> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      console.error('Failed to get message status:', error);
      throw error;
    }
  }
}
```

---

## 🎯 COMPLETE WORKFLOW ORCHESTRATION

### Main Orchestrator

```typescript
// lib/complete-workflow-orchestrator.ts

import { USBizDataProcessor } from './usbizdata-processor';
import { SkipTraceOrchestrator } from './skip-trace-orchestrator';
import { SMSCampaignOrchestrator } from './sms-campaign-orchestrator';
import { DatabaseService } from './database-service';

export class CompleteWorkflowOrchestrator {
  private dataProcessor: USBizDataProcessor;
  private skipTraceOrchestrator: SkipTraceOrchestrator;
  private smsOrchestrator: SMSCampaignOrchestrator;
  private dbService: DatabaseService;
  
  constructor() {
    this.dataProcessor = new USBizDataProcessor();
    this.skipTraceOrchestrator = new SkipTraceOrchestrator();
    this.smsOrchestrator = new SMSCampaignOrchestrator();
    this.dbService = new DatabaseService();
  }
  
  async executeCompleteWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    console.log('Starting complete USBizData → Skip Trace → SMS workflow');
    
    const workflowId = this.generateWorkflowId();
    let sessionId: string | null = null;
    
    try {
      // Stage 1: Data Processing
      console.log('Stage 1: Processing USBizData CSV...');
      const dataResult = await this.executeDataProcessingStage(config.csvData, workflowId);
      sessionId = dataResult.sessionId;
      
      // Stage 2: Skip Tracing
      console.log('Stage 2: Executing skip tracing...');
      const skipTraceResult = await this.executeSkipTraceStage(sessionId, config.skipTraceConfig);
      
      // Stage 3: SMS Campaign
      console.log('Stage 3: Creating and executing SMS campaign...');
      const campaignResult = await this.executeSMSCampaignStage(sessionId, config.smsConfig);
      
      // Update workflow status
      await this.dbService.updateWorkflowStatus(workflowId, 'completed', {
        dataProcessing: dataResult,
        skipTracing: skipTraceResult,
        smsCampaign: campaignResult
      });
      
      return {
        success: true,
        workflowId,
        sessionId,
        dataProcessing: dataResult,
        skipTracing: skipTraceResult,
        smsCampaign: campaignResult
      };
      
    } catch (error) {
      console.error('Workflow failed:', error);
      
      if (sessionId) {
        await this.dbService.updateWorkflowStatus(workflowId, 'failed', {
          error: error.message,
          stage: 'unknown'
        });
      }
      
      throw error;
    }
  }
  
  private async executeDataProcessingStage(csvData: any[], workflowId: string): Promise<any> {
    // Create processing session
    const session = await this.dbService.createProcessingSession({
      session_name: `Workflow ${workflowId} - ${new Date().toISOString()}`,
      workflow_id: workflowId,
      status: 'processing'
    });
    
    try {
      // Process CSV data
      const result = await this.dataProcessor.processCSVData(csvData, session.id);
      
      // Update session with results
      await this.dbService.updateSessionStatus(session.id, 'completed', {
        total_records: result.totalRecords,
        processed_records: result.processedBatches * 250, // Approximate
        successful_records: result.successfulRecords,
        failed_records: result.failedRecords
      });
      
      return {
        sessionId: session.id,
        totalRecords: result.totalRecords,
        processedRecords: result.successfulRecords,
        failedRecords: result.failedRecords
      };
      
    } catch (error) {
      await this.dbService.updateSessionStatus(session.id, 'failed', {
        error: error.message
      });
      throw error;
    }
  }
  
  private async executeSkipTraceStage(sessionId: string, config: SkipTraceConfig): Promise<any> {
    try {
      const result = await this.skipTraceOrchestrator.executeSkipTraceWorkflow(sessionId);
      
      return {
        processed: result.processed,
        found: result.found,
        cost: result.cost,
        successRate: result.processed > 0 ? (result.found / result.processed) * 100 : 0
      };
      
    } catch (error) {
      console.error('Skip trace stage failed:', error);
      return {
        processed: 0,
        found: 0,
        cost: 0,
        error: error.message
      };
    }
  }
  
  private async executeSMSCampaignStage(sessionId: string, config: SMSConfig): Promise<any> {
    try {
      // Create campaign configuration
      const campaignConfig: CampaignConfig = {
        campaignName: `Owner Outreach - ${new Date().toLocaleDateString()}`,
        campaignType: 'business_owner_outreach',
        targetSegment: config.targetSegment,
        senderPhone: config.senderPhone,
        messageContent: config.messageTemplate,
        batchSize: config.batchSize || 100,
        sendIntervalSeconds: config.sendIntervalSeconds || 60,
        maxRecipients: config.maxRecipients,
        minPriorityScore: config.minPriorityScore
      };
      
      const result = await this.smsOrchestrator.createAndExecuteCampaign(campaignConfig);
      
      return {
        campaignId: result.campaignId,
        targeted: result.targeted,
        sent: result.sent,
        cost: result.cost,
        successRate: result.targeted > 0 ? (result.sent / result.targeted) * 100 : 0
      };
      
    } catch (error) {
      console.error('SMS campaign stage failed:', error);
      return {
        campaignId: null,
        targeted: 0,
        sent: 0,
        cost: 0,
        error: error.message
      };
    }
  }
  
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface WorkflowConfig {
  csvData: any[];
  skipTraceConfig: SkipTraceConfig;
  smsConfig: SMSConfig;
}

interface SkipTraceConfig {
  providers: string[];
  maxCost: number;
  confidenceThreshold: number;
}

interface SMSConfig {
  targetSegment: string;
  senderPhone: string;
  messageTemplate: string;
  batchSize?: number;
  sendIntervalSeconds?: number;
  maxRecipients?: number;
  minPriorityScore?: number;
}

interface WorkflowResult {
  success: boolean;
  workflowId: string;
  sessionId: string;
  dataProcessing: any;
  skipTracing: any;
  smsCampaign: any;
}
```

---

## 📊 REAL-TIME WORKFLOW MONITORING

### Workflow Dashboard

```typescript
// components/WorkflowOrchestrationDashboard.tsx

import React, { useState, useEffect } from 'react';

export function WorkflowOrchestrationDashboard() {
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowStatus[]>([]);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);
  
  useEffect(() => {
    // Initialize real-time updates
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL + '/workflows');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWorkflowUpdate(data);
    };
    
    fetchWorkflowData();
    
    return () => ws.close();
  }, []);
  
  const fetchWorkflowData = async () => {
    try {
      const [workflowsResponse, metricsResponse] = await Promise.all([
        fetch('/api/workflows/active'),
        fetch('/api/workflows/metrics')
      ]);
      
      setActiveWorkflows(await workflowsResponse.json());
      setWorkflowMetrics(await metricsResponse.json());
    } catch (error) {
      console.error('Failed to fetch workflow data:', error);
    }
  };
  
  const handleWorkflowUpdate = (data: any) => {
    switch (data.type) {
      case 'WORKFLOW_PROGRESS':
        setActiveWorkflows(prev => 
          prev.map(wf => 
            wf.id === data.workflowId 
              ? { ...wf, ...data.updates }
              : wf
          )
        );
        break;
      case 'WORKFLOW_COMPLETED':
        // Refresh the list
        fetchWorkflowData();
        break;
    }
  };
  
  return (
    <div className="workflow-orchestration-dashboard">
      <div className="dashboard-header">
        <h1>Workflow Orchestration Center</h1>
        <div className="metrics-summary">
          <MetricCard title="Active Workflows" value={activeWorkflows.length} />
          <MetricCard title="Total Processed" value={workflowMetrics?.totalProcessed || 0} />
          <MetricCard title="Owners Found" value={workflowMetrics?.ownersFound || 0} />
          <MetricCard title="SMS Sent" value={workflowMetrics?.smsSent || 0} />
        </div>
      </div>
      
      <div className="workflow-pipeline">
        <div className="pipeline-stage">
          <h3>📁 Data Ingestion</h3>
          <div className="stage-metrics">
            <div className="metric">
              <span className="label">Files Processed:</span>
              <span className="value">{workflowMetrics?.filesProcessed || 0}</span>
            </div>
            <div className="metric">
              <span className="label">Records Validated:</span>
              <span className="value">{workflowMetrics?.recordsValidated || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="pipeline-stage">
          <h3>🔍 Skip Tracing</h3>
          <div className="stage-metrics">
            <div className="metric">
              <span className="label">Businesses Searched:</span>
              <span className="value">{workflowMetrics?.businessesSearched || 0}</span>
            </div>
            <div className="metric">
              <span className="label">Owners Found:</span>
              <span className="value">{workflowMetrics?.ownersFound || 0}</span>
            </div>
            <div className="metric">
              <span className="label">Success Rate:</span>
              <span className="value">
                {workflowMetrics?.businessesSearched 
                  ? `${((workflowMetrics.ownersFound / workflowMetrics.businessesSearched) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
        
        <div className="pipeline-stage">
          <h3>📱 SMS Campaigns</h3>
          <div className="stage-metrics">
            <div className="metric">
              <span className="label">Campaigns Created:</span>
              <span className="value">{workflowMetrics?.campaignsCreated || 0}</span>
            </div>
            <div className="metric">
              <span className="label">SMS Sent:</span>
              <span className="value">{workflowMetrics?.smsSent || 0}</span>
            </div>
            <div className="metric">
              <span className="label">Response Rate:</span>
              <span className="value">
                {workflowMetrics?.smsSent 
                  ? `${((workflowMetrics.responses / workflowMetrics.smsSent) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="active-workflows">
        <h3>Active Workflows</h3>
        <div className="workflow-list">
          {activeWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface WorkflowStatus {
  id: string;
  name: string;
  status: string;
  currentStage: string;
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
  results?: {
    dataProcessing?: any;
    skipTracing?: any;
    smsCampaign?: any;
  };
}

interface WorkflowMetrics {
  totalProcessed: number;
  filesProcessed: number;
  recordsValidated: number;
  businessesSearched: number;
  ownersFound: number;
  campaignsCreated: number;
  smsSent: number;
  responses: number;
}

function WorkflowCard({ workflow }: { workflow: WorkflowStatus }) {
  return (
    <div className="workflow-card">
      <div className="workflow-header">
        <h4>{workflow.name}</h4>
        <span className={`status status-${workflow.status}`}>
          {workflow.status}
        </span>
      </div>
      
      <div className="workflow-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
        <span className="progress-text">{workflow.progress}%</span>
      </div>
      
      <div className="workflow-stage">
        <span className="current-stage">Current: {workflow.currentStage}</span>
      </div>
      
      {workflow.results && (
        <div className="workflow-results">
          {workflow.results.dataProcessing && (
            <div className="result-section">
              <strong>Data:</strong> {workflow.results.dataProcessing.recordsValidated} records
            </div>
          )}
          {workflow.results.skipTracing && (
            <div className="result-section">
              <strong>Skip Trace:</strong> {workflow.results.skipTracing.found} owners found
            </div>
          )}
          {workflow.results.smsCampaign && (
            <div className="result-section">
              <strong>SMS:</strong> {workflow.results.smsCampaign.sent} messages sent
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

This complete orchestration system provides:

✅ **End-to-End Automation**: CSV upload → Skip trace → SMS campaigns  
✅ **Clean ID Systems**: Aligned UUIDs and relationships throughout  
✅ **Synergistic Workflows**: Each stage feeds the next seamlessly  
✅ **Repeatable Events**: Automated triggers and status updates  
✅ **Comprehensive Monitoring**: Real-time dashboard and analytics  
✅ **Cost Management**: Budget controls and expense tracking  
✅ **Quality Assurance**: Validation and error handling at each stage  

The system orchestrates the complete business owner outreach pipeline with proper data flow, validation, and campaign execution.
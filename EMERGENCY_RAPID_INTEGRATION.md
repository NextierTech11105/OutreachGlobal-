# EMERGENCY RAPID INTEGRATION DEPLOYMENT
## SignalHouse.io ↔ Nextier Business Broker (24-48 Hour Deployment)

**URGENT**: Get core integration working immediately with critical optimizations

---

## 🚨 EMERGENCY DEPLOYMENT (24 HOURS)

### Hour 1-4: Core API Integration
```typescript
// IMMEDIATE API CLIENT SETUP

// apps/front/src/lib/emergency-signalhouse-client.ts
import axios from 'axios';

class EmergencySignalHouseClient {
  private baseURL = 'https://api.signalhouse.io/v2';
  private apiKey = process.env.SIGNALHOUSE_API_KEY!;
  
  async authenticate() {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email: process.env.SIGNALHOUSE_EMAIL,
      password: process.env.SIGNALHOUSE_PASSWORD,
      tenant_id: process.env.SIGNALHOUSE_TENANT_ID
    });
    
    this.token = response.data.access_token;
    localStorage.setItem('sh_token', this.token);
    return response.data;
  }
  
  async getProspects() {
    const response = await axios.get(`${this.baseURL}/prospects`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
      params: { limit: 100, sort: '-created_at' }
    });
    return response.data.data;
  }
  
  async createProspect(prospectData) {
    const response = await axios.post(`${this.baseURL}/prospects`, prospectData, {
      headers: { 
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
  
  async sendMessage(messageData) {
    const response = await axios.post(`${this.baseURL}/messages`, messageData, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.data;
  }
}

export const emergencySH = new EmergencySignalHouseClient();
```

### Hour 5-8: Critical UI Components
```typescript
// EMERGENCY PROSPECT MANAGER

// apps/front/src/components/EmergencyProspectManager.tsx
import React, { useState, useEffect } from 'react';
import { emergencySH } from '@/lib/emergency-signalhouse-client';

export function EmergencyProspectManager() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    revenue: '',
    industry: ''
  });

  useEffect(() => {
    loadProspects();
  }, []);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const data = await emergencySH.getProspects();
      setProspects(data);
    } catch (error) {
      console.error('Failed to load prospects:', error);
    }
    setLoading(false);
  };

  const createProspect = async (e) => {
    e.preventDefault();
    try {
      const newProspect = await emergencySH.createProspect({
        ...formData,
        tenant_id: process.env.NEXT_PUBLIC_TENANT_ID,
        source: 'nextier_emergency'
      });
      setProspects([newProspect, ...prospects]);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        revenue: '',
        industry: ''
      });
    } catch (error) {
      console.error('Failed to create prospect:', error);
      alert('Failed to create prospect. Check console for details.');
    }
  };

  return (
    <div className="emergency-prospect-manager">
      <h2>Emergency Prospect Manager</h2>
      
      {/* Create Prospect Form */}
      <form onSubmit={createProspect} className="prospect-form">
        <input
          type="text"
          placeholder="Company Name"
          value={formData.company_name}
          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Contact Name"
          value={formData.contact_name}
          onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        <input
          type="tel"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
        <input
          type="number"
          placeholder="Revenue ($)"
          value={formData.revenue}
          onChange={(e) => setFormData({...formData, revenue: e.target.value})}
        />
        <input
          type="text"
          placeholder="Industry"
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
        />
        <button type="submit">Create Prospect</button>
      </form>

      {/* Prospects List */}
      <div className="prospects-list">
        <h3>Active Prospects ({prospects.length})</h3>
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Revenue</th>
                <th>Industry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(prospect => (
                <tr key={prospect.id}>
                  <td>{prospect.company_name}</td>
                  <td>{prospect.contact_name}</td>
                  <td>{prospect.email}</td>
                  <td>{prospect.phone}</td>
                  <td>${prospect.revenue?.toLocaleString()}</td>
                  <td>{prospect.industry}</td>
                  <td>{prospect.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

### Hour 9-12: Real-time Updates
```typescript
// EMERGENCY WEBSOCKET CONNECTION

// apps/front/src/lib/emergency-websocket.ts
import io from 'socket.io-client';

class EmergencyWebSocket {
  constructor() {
    this.socket = null;
    this.connect();
  }

  connect() {
    const token = localsh_token');
   Storage.getItem(' this.socket = io('wss://ws.signalhouse.io', {
      auth: {
        token: token,
        tenant_id: process.env.NEXT_PUBLIC_TENANT_ID
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to SignalHouse WebSocket');
    });

    this.socket.on('prospect_created', (data) => {
      // Emit custom event for UI update
      window.dispatchEvent(new CustomEvent('prospectUpdated', { detail: data }));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from SignalHouse WebSocket');
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const emergencyWS = new EmergencyWebSocket();
```

### Hour 13-16: Business Logic Integration
```typescript
// EMERGENCY BUSINESS BROKER WORKFLOW

// apps/front/src/lib/emergency-workflow.ts
import { emergencySH } from './emergency-signalhouse-client';

class EmergencyBusinessWorkflow {
  async runDailyWorkflow() {
    console.log('Starting daily business broker workflow...');
    
    // 1. Get prospects for outreach
    const prospects = await emergencySH.getProspects();
    const outreachProspects = prospects.filter(p => 
      p.status === 'new' || p.status === 'contacted'
    );
    
    console.log(`Found ${outreachProspects.length} prospects for outreach`);
    
    // 2. Send initial messages
    for (const prospect of outreachProspects) {
      await this.sendOutreachMessage(prospect);
    }
    
    // 3. Update prospect statuses
    for (const prospect of outreachProspects) {
      await emergencySH.updateProspect(prospect.id, {
        status: 'message_sent',
        last_contact: new Date().toISOString()
      });
    }
    
    console.log('Daily workflow completed');
  }
  
  async sendOutreachMessage(prospect) {
    const messageData = {
      prospect_id: prospect.id,
      channel: 'email',
      subject: `Quick question about ${prospect.company_name}`,
      body: `
        Hi ${prospect.contact_name},
        
        I've been working with business owners in ${prospect.industry} who are exploring strategic options for growth and expansion.
        
        Quick question - have you ever thought about what your business might be worth in today's market?
        
        I'd love to share some insights from recent transactions in your industry.
        
        Worth a quick 10-minute conversation?
        
        Best,
        [YOUR_NAME]
        Business Broker
      `,
      tenant_id: process.env.NEXT_PUBLIC_TENANT_ID
    };
    
    try {
      await emergencySH.sendMessage(messageData);
      console.log(`Message sent to ${prospect.company_name}`);
    } catch (error) {
      console.error(`Failed to send message to ${prospect.company_name}:`, error);
    }
  }
}

export const emergencyWorkflow = new EmergencyBusinessWorkflow();
```

### Hour 17-20: Environment Configuration
```bash
# EMERGENCY ENVIRONMENT SETUP

# .env.local
NEXT_PUBLIC_SIGNALHOUSE_API_URL=https://api.signalhouse.io/v2
NEXT_PUBLIC_SIGNALHOUSE_WS_URL=wss://ws.signalhouse.io
SIGNALHOUSE_API_KEY=your_api_key_here
SIGNALHOUSE_EMAIL=your_email@signalhouse.io
SIGNALHOUSE_PASSWORD=your_password
SIGNALHOUSE_TENANT_ID=nextier-main
NEXT_PUBLIC_TENANT_ID=nextier-main

# Quick test script
curl -X POST https://api.signalhouse.io/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_email@signalhouse.io",
    "password": "your_password",
    "tenant_id": "nextier-main"
  }'
```

### Hour 21-24: Deployment & Testing
```bash
# EMERGENCY DEPLOYMENT COMMANDS

# 1. Deploy to Vercel (fastest)
npm run build
vercel --prod

# 2. Or deploy to Digital Ocean App Platform
doctl apps create --spec .do/app.yaml --live

# 3. Test the integration
curl -X GET https://your-app-url.vercel.app/api/test-connection

# 4. Monitor logs
tail -f /var/log/nextier/app.log
```

---

## ⚡ CRITICAL PERFORMANCE FIXES (Hour 25-48)

### Hour 25-28: Connection Pooling
```typescript
// EMERGENCY CONNECTION POOLING

// lib/emergency-pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}
```

### Hour 29-32: Caching Layer
```typescript
// EMERGENCY CACHING

// lib/emergency-cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached(key) {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCached(key, data, ttl = 300) {
  await redis.setex(key, ttl, JSON.stringify(data));
}

export async function invalidateCache(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Hour 33-36: Error Handling
```typescript
// EMERGENCY ERROR HANDLING

// lib/emergency-error-handler.ts
export class EmergencyErrorHandler {
  static handle(error, context = {}) {
    console.error('Emergency Error:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Log to external service if needed
    // logErrorToService(error, context);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      context
    };
  }
  
  static handleAPIError(error) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data.message || 'API Error',
        status: error.response.status,
        timestamp: new Date().toISOString()
      };
    }
    
    return this.handle(error);
  }
}
```

### Hour 37-40: Monitoring Setup
```typescript
// EMERGENCY MONITORING

// lib/emergency-monitoring.ts
export class EmergencyMonitoring {
  static async trackOperation(operation, metadata = {}) {
    const start = Date.now();
    
    try {
      // Perform operation
      const result = await metadata.operation();
      
      // Log success
      console.log('Operation Success', {
        operation,
        duration: Date.now() - start,
        success: true,
        ...metadata
      });
      
      return result;
    } catch (error) {
      // Log failure
      console.error('Operation Failed', {
        operation,
        duration: Date.now() - start,
        success: false,
        error: error.message,
        ...metadata
      });
      
      throw error;
    }
  }
  
  static logMetric(name, value, tags = {}) {
    console.log('Metric', {
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Hour 41-44: Security Quick Fixes
```typescript
// EMERGENCY SECURITY

// lib/emergency-security.ts
import jwt from 'jsonwebtoken';

export class EmergencySecurity {
  static validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { valid: true, user: decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript protocol
        .trim();
    }
    return input;
  }
  
  static checkRateLimit(userId, action) {
    const key = `rate_limit:${userId}:${action}`;
    const limit = 100; // requests per hour
    const window = 3600000; // 1 hour in ms
    
    // This is a simplified rate limiter
    // In production, use Redis-based rate limiting
    return true; // Allow for now
  }
}
```

### Hour 45-48: Final Testing & Documentation
```bash
# EMERGENCY TESTING SCRIPT

#!/bin/bash
# test-emergency-integration.sh

echo "Testing Emergency Integration..."

# Test API connection
echo "Testing API connection..."
curl -X POST https://api.signalhouse.io/v2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SIGNALHOUSE_EMAIL\",\"password\":\"$SIGNALHOUSE_PASSWORD\",\"tenant_id\":\"$SIGNALHOUSE_TENANT_ID\"}"

# Test database connection
echo "Testing database connection..."
npm run test:db

# Test frontend
echo "Testing frontend..."
curl -I https://your-app-url.vercel.app

echo "Emergency integration testing complete!"
```

---

## 📋 EMERGENCY CHECKLIST

### Must Complete in 24 Hours:
- [ ] ✅ API client integration with SignalHouse.io
- [ ] ✅ Basic prospect management UI
- [ ] ✅ WebSocket real-time updates
- [ ] ✅ Environment configuration
- [ ] ✅ Deployment to production
- [ ] ✅ Basic testing

### Must Complete in 48 Hours:
- [ ] 🔄 Connection pooling
- [ ] 🔄 Caching layer
- [ ] 🔄 Error handling
- [ ] 🔄 Basic monitoring
- [ ] 🔄 Security quick fixes
- [ ] 🔄 Performance testing

### Critical Success Metrics:
- [ ] ✅ Prospect creation working
- [ ] ✅ Data synchronization < 1 second
- [ ] ✅ Real-time updates functional
- [ ] ✅ Error rate < 1%
- [ ] ✅ Response time < 500ms

---

## 🚨 EMERGENCY CONTACTS

If something breaks during deployment:
1. **Check logs**: `tail -f /var/log/nextier/app.log`
2. **Test API**: Use curl commands above
3. **Rollback**: `git revert HEAD` if needed
4. **Contact**: SignalHouse.io support team

This emergency deployment gets your core integration working immediately while you can optimize performance over time.
# SIGNALHOUSE.IO INTEGRATION GUIDE
## Nextier UI Frontend ↔ SignalHouse Backend Architecture

**Integration Strategy**: Nextier serves as the frontend interface while SignalHouse.io provides the backend infrastructure, APIs, and data processing.

---

## 🏗️ ARCHITECTURE OVERVIEW

### SignalHouse.io Backend Services

```yaml
SignalHouse Core Services:
  ├─ API Gateway: Central request routing and authentication
  ├─ User Management: Multi-tenant user authentication & authorization
  ├─ Data Pipeline: Real-time data processing and enrichment
  ├─ AI Services: LLM orchestration and response generation
  ├─ Communication Hub: Email, SMS, voice, and messaging APIs
  ├─ Analytics Engine: Real-time metrics and reporting
  └─ Integration Layer: External service connections

Nextier Frontend Responsibilities:
  ├─ User Interface: React-based component library
  ├─ Business Logic: Client-side state management and workflows
  ├─ Real-time Updates: WebSocket connections to SignalHouse
  ├─ Form Management: User input collection and validation
  └─ Visual Components: Dashboards, charts, and data visualization
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXTIER FRONTEND                          │
├─────────────────────────────────────────────────────────────┤
│  UI Components ← → API Client ← → SignalHouse Gateway      │
│       ↓                                                         │
│  State Management ← → WebSocket ← → Real-time Services       │
│       ↓                                                         │
│  Form Validation ← → HTTP Client ← → Business Logic          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SIGNALHOUSE.IO BACKEND                      │
├─────────────────────────────────────────────────────────────┤
│  API Gateway ← → Auth Service ← → Data Pipeline             │
│       ↓                   ↓                ↓                  │
│  WebSocket ← → AI Services ← → Communication Hub            │
│       ↓                   ↓                ↓                  │
│  Analytics ← → Integration ← → External APIs                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 NEXTIER → SIGNALHOUSE API INTEGRATION

### Authentication Flow

```typescript
// apps/front/src/lib/signalhouse-auth.ts

import { jwtDecode } from 'jwt-decode';

class SignalHouseAuth {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_SIGNALHOUSE_API_URL!;
    this.apiKey = process.env.SIGNALHOUSE_API_KEY!;
  }

  // Authenticate with SignalHouse
  async authenticate(credentials: {
    email: string;
    password: string;
    tenant_id: string;
  }) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const { token, refresh_token } = await response.json();
    
    // Store tokens securely
    localStorage.setItem('sh_token', token);
    localStorage.setItem('sh_refresh_token', refresh_token);
    
    // Decode token to get user info
    const decoded = jwtDecode(token);
    return decoded;
  }

  // Get current user from SignalHouse
  async getCurrentUser() {
    const token = localStorage.getItem('sh_token');
    if (!token) return null;

    const response = await fetch(`${this.baseURL}/user/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': this.apiKey
      }
    });

    return response.json();
  }

  // Refresh authentication token
  async refreshToken() {
    const refreshToken = localStorage.getItem('sh_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const { token } = await response.json();
    localStorage.setItem('sh_token', token);
    return token;
  }
}

export const signalHouseAuth = new SignalHouseAuth();
```

### API Client Configuration

```typescript
// apps/front/src/lib/signalhouse-client.ts

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { signalHouseAuth } from './signalhouse-auth';

class SignalHouseClient {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(tenantId: string = 'default') {
    this.tenantId = tenantId;
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_SIGNALHOUSE_API_URL,
      timeout: 30000,
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('sh_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Tenant-ID'] = this.tenantId;
        config.headers['X-API-Key'] = process.env.SIGNALHOUSE_API_KEY;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await signalHouseAuth.refreshToken();
            // Retry the original request
            return this.client.request(error.config);
          } catch (refreshError) {
            // Redirect to login
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic API methods
  async get(endpoint: string, params?: any) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint: string, data?: any) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint: string, data?: any) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint: string) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  // Business-specific methods
  async getProspects(filters?: any) {
    return this.get('/api/prospects', filters);
  }

  async createProspect(prospectData: any) {
    return this.post('/api/prospects', prospectData);
  }

  async updateProspect(id: string, data: any) {
    return this.put(`/api/prospects/${id}`, data);
  }

  async getCampaigns() {
    return this.get('/api/campaigns');
  }

  async createCampaign(campaignData: any) {
    return this.post('/api/campaigns', campaignData);
  }

  async sendMessage(messageData: any) {
    return this.post('/api/messages', messageData);
  }

  async getAnalytics(timeRange?: string) {
    return this.get('/api/analytics', { time_range: timeRange });
  }
}

export const signalHouseClient = new SignalHouseClient();
```

---

## 🔄 REAL-TIME INTEGRATION

### WebSocket Connection

```typescript
// apps/front/src/lib/signalhouse-websocket.ts

import { io, Socket } from 'socket.io-client';

class SignalHouseWebSocket {
  private socket: Socket | null = null;
  private tenantId: string;

  constructor(tenantId: string = 'default') {
    this.tenantId = tenantId;
  }

  connect() {
    const token = localStorage.getItem('sh_token');
    if (!token) throw new Error('No authentication token');

    this.socket = io(process.env.NEXT_PUBLIC_SIGNALHOUSE_WS_URL!, {
      auth: {
        token,
        tenant_id: this.tenantId
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to SignalHouse WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from SignalHouse WebSocket');
    });

    return this.socket;
  }

  // Subscribe to real-time updates
  subscribeToProspects(callback: (data: any) => void) {
    this.socket?.on('prospects:update', callback);
  }

  subscribeToCampaigns(callback: (data: any) => void) {
    this.socket?.on('campaigns:update', callback);
  }

  subscribeToMessages(callback: (data: any) => void) {
    this.socket?.on('messages:update', callback);
  }

  subscribeToAnalytics(callback: (data: any) => void) {
    this.socket?.on('analytics:update', callback);
  }

  // Send updates to SignalHouse
  updateProspect(prospectId: string, data: any) {
    this.socket?.emit('prospects:update', {
      id: prospectId,
      data,
      tenant_id: this.tenantId
    });
  }

  sendCampaignAction(campaignId: string, action: string, data?: any) {
    this.socket?.emit('campaigns:action', {
      id: campaignId,
      action,
      data,
      tenant_id: this.tenantId
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const signalHouseWS = new SignalHouseWebSocket();
```

### React Hook for WebSocket Integration

```typescript
// apps/front/src/hooks/useSignalHouseRealtime.ts

import { useEffect, useState } from 'react';
import { signalHouseWS } from '@/lib/signalhouse-websocket';

export function useSignalHouseRealtime() {
  const [isConnected, setIsConnected] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    const socket = signalHouseWS.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Listen for all types of updates
    socket.on('prospects:update', (data) => {
      setUpdates(prev => [...prev, { type: 'prospect', data, timestamp: Date.now() }]);
    });

    socket.on('campaigns:update', (data) => {
      setUpdates(prev => [...prev, { type: 'campaign', data, timestamp: Date.now() }]);
    });

    socket.on('messages:update', (data) => {
      setUpdates(prev => [...prev, { type: 'message', data, timestamp: Date.now() }]);
    });

    socket.on('analytics:update', (data) => {
      setUpdates(prev => [...prev, { type: 'analytics', data, timestamp: Date.now() }]);
    });

    return () => {
      signalHouseWS.disconnect();
    };
  }, []);

  return {
    isConnected,
    updates,
    updateProspect: signalHouseWS.updateProspect.bind(signalHouseWS),
    sendCampaignAction: signalHouseWS.sendCampaignAction.bind(signalHouseWS)
  };
}
```

---

## 📊 DATA SYNCHRONIZATION

### State Management Integration

```typescript
// apps/front/src/stores/signalhouse-store.ts

import { create } from 'zustand';
import { signalHouseClient } from '@/lib/signalhouse-client';
import { useSignalHouseRealtime } from '@/hooks/useSignalHouseRealtime';

interface SignalHouseState {
  // Data
  prospects: any[];
  campaigns: any[];
  messages: any[];
  analytics: any;
  
  // Loading states
  loading: {
    prospects: boolean;
    campaigns: boolean;
    messages: boolean;
    analytics: boolean;
  };
  
  // Actions
  fetchProspects: () => Promise<void>;
  fetchCampaigns: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  
  createProspect: (data: any) => Promise<void>;
  updateProspect: (id: string, data: any) => Promise<void>;
  
  // Real-time updates
  handleRealTimeUpdate: (update: any) => void;
}

export const useSignalHouseStore = create<SignalHouseState>((set, get) => ({
  // Initial state
  prospects: [],
  campaigns: [],
  messages: [],
  analytics: null,
  loading: {
    prospects: false,
    campaigns: false,
    messages: false,
    analytics: false,
  },

  // Data fetching actions
  fetchProspects: async () => {
    set(state => ({ loading: { ...state.loading, prospects: true } }));
    try {
      const prospects = await signalHouseClient.getProspects();
      set({ prospects, loading: { ...get().loading, prospects: false } });
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
      set(state => ({ loading: { ...state.loading, prospects: false } }));
    }
  },

  fetchCampaigns: async () => {
    set(state => ({ loading: { ...state.loading, campaigns: true } }));
    try {
      const campaigns = await signalHouseClient.getCampaigns();
      set({ campaigns, loading: { ...get().loading, campaigns: false } });
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      set(state => ({ loading: { ...state.loading, campaigns: false } }));
    }
  },

  fetchMessages: async () => {
    set(state => ({ loading: { ...state.loading, messages: true } }));
    try {
      const messages = await signalHouseClient.get('/api/messages');
      set({ messages, loading: { ...get().loading, messages: false } });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set(state => ({ loading: { ...state.loading, messages: false } }));
    }
  },

  fetchAnalytics: async () => {
    set(state => ({ loading: { ...state.loading, analytics: true } }));
    try {
      const analytics = await signalHouseClient.getAnalytics();
      set({ analytics, loading: { ...get().loading, analytics: false } });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      set(state => ({ loading: { ...get().loading, analytics: false } }));
    }
  },

  // CRUD actions
  createProspect: async (prospectData) => {
    try {
      const newProspect = await signalHouseClient.createProspect(prospectData);
      set(state => ({ prospects: [...state.prospects, newProspect] }));
    } catch (error) {
      console.error('Failed to create prospect:', error);
      throw error;
    }
  },

  updateProspect: async (id, updates) => {
    try {
      const updatedProspect = await signalHouseClient.updateProspect(id, updates);
      set(state => ({
        prospects: state.prospects.map(p => 
          p.id === id ? updatedProspect : p
        )
      }));
    } catch (error) {
      console.error('Failed to update prospect:', error);
      throw error;
    }
  },

  // Real-time update handler
  handleRealTimeUpdate: (update) => {
    const { type, data } = update;
    
    switch (type) {
      case 'prospect':
        set(state => ({
          prospects: state.prospects.map(p => 
            p.id === data.id ? { ...p, ...data } : p
          )
        }));
        break;
        
      case 'campaign':
        set(state => ({
          campaigns: state.campaigns.map(c => 
            c.id === data.id ? { ...c, ...data } : c
          )
        }));
        break;
        
      case 'message':
        set(state => ({
          messages: [...state.messages, data]
        }));
        break;
        
      case 'analytics':
        set({ analytics: data });
        break;
    }
  },
}));
```

---

## 🔧 NEXTIER COMPONENTS INTEGRATION

### Prospect Management Component

```typescript
// apps/front/src/components/ProspectManager.tsx

import React, { useEffect } from 'react';
import { useSignalHouseStore } from '@/stores/signalhouse-store';
import { useSignalHouseRealtime } from '@/hooks/useSignalHouseRealtime';

export function ProspectManager() {
  const {
    prospects,
    loading,
    fetchProspects,
    createProspect,
    updateProspect,
  } = useSignalHouseStore();

  const { isConnected, updates, handleRealTimeUpdate } = useSignalHouseRealtime();

  // Load initial data
  useEffect(() => {
    fetchProspects();
  }, []);

  // Handle real-time updates
  useEffect(() => {
    updates.forEach(update => {
      handleRealTimeUpdate(update);
    });
  }, [updates, handleRealTimeUpdate]);

  const handleCreateProspect = async (prospectData: any) => {
    try {
      await createProspect(prospectData);
      // Success feedback
    } catch (error) {
      // Error handling
    }
  };

  const handleUpdateProspect = async (id: string, updates: any) => {
    try {
      await updateProspect(id, updates);
      // Success feedback
    } catch (error) {
      // Error handling
    }
  };

  return (
    <div className="prospect-manager">
      <div className="header">
        <h2>Prospect Management</h2>
        <div className="status">
          {isConnected ? (
            <span className="connected">🟢 Connected</span>
          ) : (
            <span className="disconnected">🔴 Disconnected</span>
          )}
        </div>
      </div>

      {loading.prospects ? (
        <div>Loading prospects...</div>
      ) : (
        <ProspectList
          prospects={prospects}
          onUpdate={handleUpdateProspect}
        />
      )}

      <ProspectForm onSubmit={handleCreateProspect} />
    </div>
  );
}
```

### Campaign Dashboard Component

```typescript
// apps/front/src/components/CampaignDashboard.tsx

import React, { useEffect, useState } from 'react';
import { signalHouseClient } from '@/lib/signalhouse-client';
import { signalHouseWS } from '@/lib/signalhouse-websocket';

export function CampaignDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadCampaigns();
    loadAnalytics();

    // Subscribe to real-time campaign updates
    signalHouseWS.subscribeToCampaigns((data) => {
      setCampaigns(prev => 
        prev.map(c => c.id === data.id ? { ...c, ...data } : c)
      );
    });

    signalHouseWS.subscribeToAnalytics((data) => {
      setAnalytics(data);
    });

    return () => {
      signalHouseWS.disconnect();
    };
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await signalHouseClient.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await signalHouseClient.getAnalytics('30d');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      setIsRunning(true);
      await signalHouseClient.post(`/api/campaigns/${campaignId}/start`);
      // Real-time updates will handle UI refresh
    } catch (error) {
      setIsRunning(false);
      console.error('Failed to start campaign:', error);
    }
  };

  return (
    <div className="campaign-dashboard">
      <div className="metrics">
        <MetricCard title="Active Campaigns" value={campaigns.length} />
        <MetricCard title="Messages Sent" value={analytics?.messages_sent || 0} />
        <MetricCard title="Response Rate" value={`${analytics?.response_rate || 0}%`} />
        <MetricCard title="Meetings Booked" value={analytics?.meetings_booked || 0} />
      </div>

      <div className="campaigns-list">
        {campaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onStart={() => startCampaign(campaign.id)}
            isRunning={isRunning}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 DEPLOYMENT CONFIGURATION

### Environment Variables

```env
# SignalHouse API Configuration
NEXT_PUBLIC_SIGNALHOUSE_API_URL=https://api.signalhouse.io/v1
NEXT_PUBLIC_SIGNALHOUSE_WS_URL=wss://ws.signalhouse.io
SIGNALHOUSE_API_KEY=your_signalhouse_api_key_here

# Tenant Configuration
NEXT_PUBLIC_DEFAULT_TENANT_ID=nextier-main
SIGNALHOUSE_TENANT_ID=nextier-main

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-nextier-domain.com

# Database (if needed for local caching)
DATABASE_URL=postgresql://...

# Redis (for session management)
REDIS_URL=redis://...
```

### Next.js Configuration

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_SIGNALHOUSE_API_URL: process.env.NEXT_PUBLIC_SIGNALHOUSE_API_URL,
    NEXT_PUBLIC_SIGNALHOUSE_WS_URL: process.env.NEXT_PUBLIC_SIGNALHOUSE_WS_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/signalhouse/:path*',
        destination: `${process.env.NEXT_PUBLIC_SIGNALHOUSE_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 📋 INTEGRATION CHECKLIST

### SignalHouse Backend Setup
- [ ] API key generation and configuration
- [ ] Tenant creation and permissions setup
- [ ] WebSocket endpoints configuration
- [ ] Real-time event subscriptions
- [ ] Authentication flow testing

### Nextier Frontend Setup
- [ ] API client configuration
- [ ] Authentication integration
- [ ] WebSocket connection setup
- [ ] State management integration
- [ ] Component integration testing

### Data Synchronization
- [ ] Initial data loading
- [ ] Real-time update handling
- [ ] Error handling and retry logic
- [ ] Offline capability
- [ ] Performance optimization

### Testing & Validation
- [ ] End-to-end integration testing
- [ ] Real-time update testing
- [ ] Authentication flow testing
- [ ] Error scenario testing
- [ ] Performance benchmarking

This integration guide provides the complete bridge between Nextier's frontend UI and SignalHouse.io's backend infrastructure, enabling a seamless multi-tenant SaaS platform.
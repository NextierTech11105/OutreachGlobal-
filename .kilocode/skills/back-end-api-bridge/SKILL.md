---
name: back-end-api-bridge
description: Manages API communication between frontend and backend services, handling requests, responses, and error states
---

# Back-End API Bridge

## Overview
Enhances the existing API communication layer in `apps/front/src/services/api/` and `apps/api/src/` to provide robust, secure, and efficient communication between frontend and backend services, with comprehensive error handling and response management.

## Key Features
- Centralized API client with automatic retries
- Request/response interceptors for authentication
- Error handling with user-friendly messages
- Request caching and deduplication
- Multi-tenant request routing
- Real-time WebSocket support
- API versioning and backward compatibility

## Implementation Steps

### 1. Enhance API Client
Update `apps/front/src/services/api/client.ts`:

```typescript
--- a/apps/front/src/services/api/client.ts
+++ b/apps/front/src/services/api/client.ts
@@ -1,15 +1,35 @@
 import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant } from '@/hooks/useTenant';
+import { ApiError, handleApiError } from './errors';
+import { cacheRequest, getCachedResponse } from './cache';
 
 class ApiClient {
   private client: AxiosInstance;
+  private requestQueue: Map<string, Promise<any>> = new Map();
 
   constructor() {
     this.client = axios.create({
       baseURL: process.env.NEXT_PUBLIC_API_URL,
       timeout: 30000,
     });
 
+    this.setupInterceptors();
+  }
+
+  private setupInterceptors() {
+    // Request interceptor
     this.client.interceptors.request.use(
       (config) => {
+        const { user } = useAuth();
+        const { tenantId } = useTenant();
+
+        if (user?.token) {
+          config.headers.Authorization = `Bearer ${user.token}`;
+        }
+
+        if (tenantId) {
+          config.headers['X-Tenant-ID'] = tenantId;
+        }
+
         return config;
       },
       (error) => Promise.reject(error)
@@ -17,10 +37,25 @@
 
+    // Response interceptor
     this.client.interceptors.response.use(
       (response) => response,
       (error) => {
-        // Handle errors
-        return Promise.reject(error);
+        return Promise.reject(handleApiError(error));
       }
     );
   }
+
+  async request<T>(config: AxiosRequestConfig): Promise<T> {
+    const cacheKey = this.getCacheKey(config);
+    
+    // Check cache first
+    const cached = getCachedResponse(cacheKey);
+    if (cached) return cached;
+
+    // Deduplicate concurrent requests
+    if (this.requestQueue.has(cacheKey)) {
+      return this.requestQueue.get(cacheKey);
+    }
+
+    const promise = this.client.request(config)
+      .then(response => {
+        cacheRequest(cacheKey, response.data);
+        return response.data;
+      })
+      .finally(() => {
+        this.requestQueue.delete(cacheKey);
+      });
+
+    this.requestQueue.set(cacheKey, promise);
+    return promise;
+  }
+
+  private getCacheKey(config: AxiosRequestConfig): string {
+    return `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
+  }
 }
 
 export const apiClient = new ApiClient();
```

### 2. Implement Error Handling
Create `apps/front/src/services/api/errors.ts`:

```typescript
--- /dev/null
+++ b/apps/front/src/services/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return new ApiError('Invalid request data', status, 'VALIDATION_ERROR', data.errors);
      case 401:
        return new ApiError('Authentication required', status, 'UNAUTHORIZED');
      case 403:
        return new ApiError('Access denied', status, 'FORBIDDEN');
      case 404:
        return new ApiError('Resource not found', status, 'NOT_FOUND');
      case 429:
        return new ApiError('Too many requests', status, 'RATE_LIMITED');
      case 500:
        return new ApiError('Server error', status, 'SERVER_ERROR');
      default:
        return new ApiError(data?.message || 'Request failed', status);
    }
  }
  
  if (error.request) {
    return new ApiError('Network error', 0, 'NETWORK_ERROR');
  }
  
  return new ApiError('Unknown error', 0, 'UNKNOWN_ERROR');
};
```

### 3. Add Request Caching
Create `apps/front/src/services/api/cache.ts`:

```typescript
--- /dev/null
+++ b/apps/front/src/services/api/cache.ts
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttl = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();

export const cacheRequest = (key: string, data: any, ttl?: number) => {
  apiCache.set(key, data, ttl);
};

export const getCachedResponse = (key: string) => {
  return apiCache.get(key);
};
```

### 4. Implement WebSocket Support
Create `apps/front/src/services/api/websocket.ts`:

```typescript
--- /dev/null
+++ b/apps/front/src/services/api/websocket.ts
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { user } = useAuth();
      const { tenantId } = useTenant();
      
      if (!user?.token || !tenantId) {
        reject(new Error('Authentication required'));
        return;
      }
      
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?token=${user.token}&tenant=${tenantId}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };
      
      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch(() => {});
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }
  
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  onMessage(callback: (data: any) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    }
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
```

### 5. Create API Service Layer
Update `apps/front/src/services/api/index.ts`:

```typescript
--- a/apps/front/src/services/api/index.ts
+++ b/apps/front/src/services/api/index.ts
import { apiClient } from './client';
import { wsClient } from './websocket';

export class ApiService {
  // Campaigns
  async getCampaigns(params?: any) {
    return apiClient.request({
      method: 'GET',
      url: '/campaigns',
      params
    });
  }
  
  async createCampaign(data: any) {
    return apiClient.request({
      method: 'POST',
      url: '/campaigns',
      data
    });
  }
  
  // Leads
  async getLeads(params?: any) {
    return apiClient.request({
      method: 'GET',
      url: '/leads',
      params
    });
  }
  
  async updateLead(id: string, data: any) {
    return apiClient.request({
      method: 'PUT',
      url: `/leads/${id}`,
      data
    });
  }
  
  // Real-time subscriptions
  subscribeToCampaigns(callback: (data: any) => void) {
    wsClient.connect().then(() => {
      wsClient.send({ type: 'subscribe', channel: 'campaigns' });
      wsClient.onMessage(callback);
    });
  }
}

export const apiService = new ApiService();
```

## Dependencies
- `authentication-authorization-handler` - for request authentication
- `state-management-coordinator` - for API state management
- `database-management-engine` - for backend data operations
- `service-orchestration-hub` - for backend service coordination

## Testing
- Unit tests for API client methods
- Integration tests for request/response cycles
- Error handling tests for various failure scenarios
- WebSocket connection and reconnection tests
- Caching behavior tests

## Notes
- Implement request deduplication to prevent duplicate API calls
- Use optimistic updates for better UX
- Implement proper loading states and error boundaries
- Support API versioning with backward compatibility
- Monitor API usage and performance metrics
- Handle offline scenarios with service workers
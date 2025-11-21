# Custom Integrations Guide

## Adding SignalHouse.io and Real Estate API Integrations

### Overview

This guide will help you add two custom integrations to Nextier:
1. **SignalHouse.io** - for SMS messaging
2. **Real Estate API** - for importing properties and leads

---

## Integration 1: SignalHouse.io

### What You Need

From SignalHouse.io dashboard, get:
- API Key
- Account ID (if required)
- API Base URL

### Backend Implementation

**File:** `apps/api/src/app/integration/services/signalhouse.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SignalHouseSMSOptions {
  to: string;          // Phone number to send to
  from: string;        // Your SignalHouse number
  body: string;        // Message content
}

export interface SignalHouseAuthData {
  apiKey: string;
  accountId?: string;
}

@Injectable()
export class SignalHouseService {
  private http: AxiosInstance;
  private baseUrl = 'https://api.signalhouse.io'; // Update with actual URL

  constructor(private configService: ConfigService) {
    this.http = axios.create({
      baseURL: this.baseUrl,
    });
  }

  /**
   * Send SMS via SignalHouse
   */
  async sendSMS(authData: SignalHouseAuthData, options: SignalHouseSMSOptions) {
    try {
      const { data } = await this.http.post('/messages', {
        to: options.to,
        from: options.from,
        body: options.body,
      }, {
        headers: {
          'Authorization': `Bearer ${authData.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: data.id,
        status: data.status,
      };
    } catch (error) {
      console.error('SignalHouse SMS Error:', error.response?.data || error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(authData: SignalHouseAuthData, messageId: string) {
    const { data } = await this.http.get(`/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${authData.apiKey}`,
      },
    });

    return data;
  }

  /**
   * Get account balance/credits
   */
  async getBalance(authData: SignalHouseAuthData) {
    const { data } = await this.http.get('/account/balance', {
      headers: {
        'Authorization': `Bearer ${authData.apiKey}`,
      },
    });

    return data.balance;
  }

  /**
   * Test connection
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      await this.http.get('/account', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Register Service

**File:** `apps/api/src/app/integration/integration.module.ts`

```typescript
import { SignalHouseService } from './services/signalhouse.service';

@CustomModule({
  // ... existing config
  providers: [
    IntegrationService,
    ZohoService,
    SignalHouseService, // Add this
    IntegrationFieldService,
    IntegrationTaskService,
  ],
})
export class IntegrationModule {}
```

### Environment Variables

Add to `.env` or DigitalOcean environment:

```bash
SIGNALHOUSE_API_KEY=your_api_key_here
SIGNALHOUSE_PHONE_NUMBER=+1234567890
```

---

## Integration 2: Real Estate API

### What You Need

Depending on your data source:
- MLS API credentials
- PropStream API access
- REIPro API key
- Or custom CSV/Excel import

### Backend Implementation

**File:** `apps/api/src/app/integration/services/real-estate-api.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PropertyData {
  externalId: string;
  ownerFirstName: string;
  ownerLastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  useCode?: string;
  propertyType?: string;
  ownerOccupied?: boolean;
  lotSquareFeet?: number;
  buildingSquareFeet?: number;
  assessedValue?: number;
  estimatedValue?: number;
  yearBuilt?: number;
}

export interface RealEstateAPIAuthData {
  apiKey: string;
  userId?: string;
}

@Injectable()
export class RealEstateAPIService {
  private http: AxiosInstance;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Update with your actual API URL
    this.baseUrl = this.configService.get('REAL_ESTATE_API_URL') || 'https://api.example-mls.com';

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Search properties by criteria
   */
  async searchProperties(
    authData: RealEstateAPIAuthData,
    filters: {
      zipCodes?: string[];
      city?: string;
      state?: string;
      minValue?: number;
      maxValue?: number;
      ownerOccupied?: boolean;
      propertyType?: string;
      limit?: number;
    }
  ): Promise<PropertyData[]> {
    try {
      const { data } = await this.http.post('/properties/search', filters, {
        headers: {
          'Authorization': `Bearer ${authData.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Map API response to our PropertyData format
      return data.properties.map((prop: any) => ({
        externalId: prop.id,
        ownerFirstName: prop.owner_first_name,
        ownerLastName: prop.owner_last_name,
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zipCode: prop.zip_code,
        useCode: prop.use_code,
        propertyType: prop.property_type,
        ownerOccupied: prop.owner_occupied,
        lotSquareFeet: prop.lot_sqft,
        buildingSquareFeet: prop.building_sqft,
        assessedValue: prop.assessed_value,
        estimatedValue: prop.estimated_value,
        yearBuilt: prop.year_built,
      }));
    } catch (error) {
      console.error('Real Estate API Error:', error.response?.data || error.message);
      throw new Error(`Failed to search properties: ${error.message}`);
    }
  }

  /**
   * Get property details by ID
   */
  async getProperty(authData: RealEstateAPIAuthData, propertyId: string): Promise<PropertyData> {
    const { data } = await this.http.get(`/properties/${propertyId}`, {
      headers: {
        'Authorization': `Bearer ${authData.apiKey}`,
      },
    });

    return {
      externalId: data.id,
      ownerFirstName: data.owner_first_name,
      ownerLastName: data.owner_last_name,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      useCode: data.use_code,
      propertyType: data.property_type,
      ownerOccupied: data.owner_occupied,
      lotSquareFeet: data.lot_sqft,
      buildingSquareFeet: data.building_sqft,
      assessedValue: data.assessed_value,
      estimatedValue: data.estimated_value,
      yearBuilt: data.year_built,
    };
  }

  /**
   * Test API connection
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      await this.http.get('/account/verify', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### CSV Import Alternative

If you don't have an API, here's a CSV import service:

**File:** `apps/api/src/app/integration/services/property-csv-import.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PropertyData } from './real-estate-api.service';

@Injectable()
export class PropertyCSVImportService {
  /**
   * Parse CSV and convert to PropertyData array
   */
  async parseCSV(csvContent: string): Promise<PropertyData[]> {
    const records = parse(csvContent, {
      columns: true, // Use first row as headers
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((row: any) => ({
      externalId: row['Property ID'] || row['id'] || '',
      ownerFirstName: row['Owner First Name'] || '',
      ownerLastName: row['Owner Last Name'] || '',
      address: row['Address'] || '',
      city: row['City'] || '',
      state: row['State'] || '',
      zipCode: row['Zip Code'] || row['ZIP'] || '',
      useCode: row['Use Code'] || '',
      propertyType: row['Property Type'] || '',
      ownerOccupied: row['Owner Occupied']?.toLowerCase() === 'yes',
      lotSquareFeet: parseFloat(row['Lot Sqft']) || undefined,
      buildingSquareFeet: parseFloat(row['Building Sqft']) || undefined,
      assessedValue: parseFloat(row['Assessed Value']) || undefined,
      estimatedValue: parseFloat(row['Estimated Value']) || undefined,
      yearBuilt: parseInt(row['Year Built']) || undefined,
    }));
  }

  /**
   * Example CSV template
   */
  getTemplateCSV(): string {
    return `Property ID,Owner First Name,Owner Last Name,Address,City,State,Zip Code,Property Type,Owner Occupied,Lot Sqft,Building Sqft,Assessed Value,Estimated Value,Year Built
123,John,Doe,123 Main St,New York,NY,10001,Single Family,Yes,5000,2000,350000,400000,1995
456,Jane,Smith,456 Oak Ave,Los Angeles,CA,90001,Condo,No,0,1200,250000,275000,2005`;
  }
}
```

### Register Services

**File:** `apps/api/src/app/integration/integration.module.ts`

```typescript
import { RealEstateAPIService } from './services/real-estate-api.service';
import { PropertyCSVImportService } from './services/property-csv-import.service';

@CustomModule({
  // ... existing config
  providers: [
    IntegrationService,
    ZohoService,
    SignalHouseService,
    RealEstateAPIService,        // Add this
    PropertyCSVImportService,      // Add this
    IntegrationFieldService,
    IntegrationTaskService,
  ],
})
export class IntegrationModule {}
```

---

## Usage in Campaigns

### Send SMS via SignalHouse

```typescript
// In your campaign consumer or message service
import { SignalHouseService } from '@/app/integration/services/signalhouse.service';

@Injectable()
export class CampaignMessagingService {
  constructor(
    private signalHouseService: SignalHouseService,
  ) {}

  async sendCampaignSMS(lead: Lead, template: string) {
    // Get SignalHouse credentials from team settings
    const authData = {
      apiKey: teamSettings.SIGNALHOUSE_API_KEY,
    };

    // Send SMS
    const result = await this.signalHouseService.sendSMS(authData, {
      to: lead.phone,
      from: teamSettings.SIGNALHOUSE_PHONE_NUMBER,
      body: template.replace('{{firstName}}', lead.firstName),
    });

    console.log('SMS sent:', result.messageId);
  }
}
```

### Import Properties

```typescript
// In a GraphQL mutation or background job
import { RealEstateAPIService } from '@/app/integration/services/real-estate-api.service';
import { PropertyService } from '@/app/property/services/property.service';

@Injectable()
export class PropertyImportService {
  constructor(
    private realEstateAPI: RealEstateAPIService,
    private propertyService: PropertyService,
  ) {}

  async importProperties(teamId: string, filters: any) {
    // Get API credentials from team settings
    const authData = {
      apiKey: teamSettings.REAL_ESTATE_API_KEY,
    };

    // Fetch properties from API
    const properties = await this.realEstateAPI.searchProperties(authData, filters);

    // Save to database
    for (const propData of properties) {
      await this.propertyService.create({
        teamId,
        externalId: propData.externalId,
        ownerFirstName: propData.ownerFirstName,
        ownerLastName: propData.ownerLastName,
        address: {
          street: propData.address,
          city: propData.city,
          state: propData.state,
          zipCode: propData.zipCode,
        },
        useCode: propData.useCode,
        type: propData.propertyType,
        ownerOccupied: propData.ownerOccupied,
        lotSquareFeet: propData.lotSquareFeet,
        buildingSquareFeet: propData.buildingSquareFeet,
        assessedValue: propData.assessedValue,
        estimatedValue: propData.estimatedValue,
        yearBuilt: propData.yearBuilt,
      });
    }

    console.log(`Imported ${properties.length} properties`);
  }
}
```

---

## Frontend UI Components

### SignalHouse Settings Page

**File:** `apps/front/src/app/t/[team]/integrations/signalhouse/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignalHouseSettings() {
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Call your GraphQL mutation to test connection
      const result = await testSignalHouseConnection({ apiKey });
      setTestResult(result ? 'Connection successful!' : 'Connection failed');
    } catch (error) {
      setTestResult('Error: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">SignalHouse.io Settings</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your SignalHouse API key"
          />
        </div>

        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1234567890"
          />
        </div>

        <Button
          onClick={handleTestConnection}
          disabled={!apiKey || testing}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>

        {testResult && (
          <p className={testResult.includes('successful') ? 'text-green-600' : 'text-red-600'}>
            {testResult}
          </p>
        )}
      </div>
    </div>
  );
}
```

### Property Import Page

**File:** `apps/front/src/app/t/[team]/properties/import/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function PropertyImport() {
  const [zipCodes, setZipCodes] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      // Call GraphQL mutation to import properties
      await importProperties({
        zipCodes: zipCodes.split(',').map(z => z.trim()),
        minValue: minValue ? parseInt(minValue) : undefined,
        maxValue: maxValue ? parseInt(maxValue) : undefined,
      });
      alert('Import started! Check the Properties page in a few minutes.');
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Properties</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="zipCodes">Zip Codes (comma-separated)</Label>
          <Input
            id="zipCodes"
            value={zipCodes}
            onChange={(e) => setZipCodes(e.target.value)}
            placeholder="10001, 10002, 10003"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minValue">Min Value</Label>
            <Input
              id="minValue"
              type="number"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="100000"
            />
          </div>

          <div>
            <Label htmlFor="maxValue">Max Value</Label>
            <Input
              id="maxValue"
              type="number"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              placeholder="500000"
            />
          </div>
        </div>

        <Button
          onClick={handleImport}
          disabled={!zipCodes || importing}
        >
          {importing ? 'Importing...' : 'Start Import'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Environment Variables

Add to DigitalOcean App Platform (both services):

```bash
# SignalHouse.io
SIGNALHOUSE_API_KEY=your_key_here
SIGNALHOUSE_PHONE_NUMBER=+1234567890

# Real Estate API
REAL_ESTATE_API_URL=https://api.your-mls-provider.com
REAL_ESTATE_API_KEY=your_api_key_here
```

---

## Next Steps

1. **Get API Credentials**
   - Sign up for SignalHouse.io and get API key
   - Get Real Estate API access (MLS, PropStream, etc.)

2. **Create Service Files**
   - Copy the service code above into your project
   - Customize API endpoints and data mapping

3. **Test Locally**
   - Add env variables to `apps/api/.env`
   - Test connections with sample data

4. **Deploy to Production**
   - Add environment variables in DigitalOcean
   - Push code to trigger deployment

5. **Use in Campaigns**
   - Configure in team settings
   - Import properties
   - Create campaigns targeting imported leads

---

**Need Help?**

If you need help with:
- Specific API documentation
- Data mapping
- Custom requirements

Let me know the exact API endpoints and I can customize the integration code!

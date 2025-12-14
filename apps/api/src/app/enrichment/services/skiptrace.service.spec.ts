import { Test, TestingModule } from '@nestjs/testing';
import { SkipTraceService, SkipTraceEnrichmentJob } from './skiptrace.service';
import { RealEstateApiService } from './realestate-api.service';
import { getQueueToken } from '@nestjs/bullmq';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('SkipTraceService', () => {
  let service: SkipTraceService;
  let mockDb: any;
  let mockRealEstateApi: any;
  let mockSkipTraceQueue: any;
  let mockLeadCardQueue: any;

  const mockSkipTraceResponse = {
    success: true,
    match_score: 0.95,
    output: {
      phones: [
        {
          phone_number: '+1234567890',
          phone_type: 'mobile',
          carrier: 'Verizon',
          line_type: 'mobile',
          is_connected: true,
          is_primary: true,
          score: 0.9,
        },
      ],
      emails: [
        {
          email_address: 'john@example.com',
          email_type: 'personal',
          is_valid: true,
          is_primary: true,
          score: 0.85,
        },
      ],
      addresses: [
        {
          street_address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          zip4: '1234',
          county: 'New York County',
          address_type: 'residential',
          is_current: true,
          lat: 40.7128,
          lng: -74.006,
        },
      ],
      social_profiles: [
        {
          platform: 'LinkedIn',
          url: 'https://linkedin.com/in/johndoe',
          username: 'johndoe',
        },
      ],
      demographics: {
        education: 'College',
        occupation: 'Software Engineer',
        employer: 'Tech Corp',
        income_range: '$100k-$150k',
        net_worth_range: '$500k-$1M',
        marital_status: 'Married',
        household_size: 3,
        has_children: true,
        home_owner_status: 'Owner',
        length_of_residence: '5 years',
        interests: ['Technology', 'Travel'],
      },
    },
  };

  const mockJob: SkipTraceEnrichmentJob = {
    teamId: 'team-123',
    personaId: 'persona-123',
    sourceType: 'property',
    sourceId: 'property-456',
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
          returning: jest.fn().mockResolvedValue([{}]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    mockRealEstateApi = {
      skipTrace: jest.fn().mockResolvedValue(mockSkipTraceResponse),
    };

    mockSkipTraceQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    mockLeadCardQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-456' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkipTraceService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: RealEstateApiService,
          useValue: mockRealEstateApi,
        },
        {
          provide: getQueueToken('skiptrace'),
          useValue: mockSkipTraceQueue,
        },
        {
          provide: getQueueToken('lead-card'),
          useValue: mockLeadCardQueue,
        },
      ],
    }).compile();

    service = module.get<SkipTraceService>(SkipTraceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queueEnrichment', () => {
    it('should add job to skip trace queue', async () => {
      const result = await service.queueEnrichment(mockJob);

      expect(result).toBeDefined();
      expect(mockSkipTraceQueue.add).toHaveBeenCalledWith(
        'ENRICH_PERSONA',
        mockJob,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
        }),
      );
    });
  });

  describe('enrichPersona', () => {
    it('should successfully enrich persona with skip trace data', async () => {
      const result = await service.enrichPersona(mockJob);

      expect(result.success).toBe(true);
      expect(result.personaId).toBe('persona-123');
      expect(result.phonesAdded).toBe(1);
      expect(result.emailsAdded).toBe(1);
      expect(result.addressesAdded).toBe(1);
      expect(result.socialsAdded).toBe(1);
      expect(result.demographicsUpdated).toBe(true);
      expect(result.matchConfidence).toBe(0.95);

      expect(mockRealEstateApi.skipTrace).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockLeadCardQueue.add).toHaveBeenCalledWith(
        'UPDATE_FROM_SKIPTRACE',
        expect.objectContaining({
          teamId: 'team-123',
          personaId: 'persona-123',
        }),
        expect.any(Object),
      );
    });

    it('should handle failed skip trace response', async () => {
      mockRealEstateApi.skipTrace.mockResolvedValue({
        success: false,
        error: { message: 'No match found' },
      });

      const result = await service.enrichPersona(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No match found');
      expect(result.phonesAdded).toBe(0);
      expect(result.emailsAdded).toBe(0);
    });

    it('should handle skip trace with empty output', async () => {
      mockRealEstateApi.skipTrace.mockResolvedValue({
        success: true,
        match_score: 0.5,
        output: {},
      });

      const result = await service.enrichPersona(mockJob);

      expect(result.success).toBe(true);
      expect(result.phonesAdded).toBe(0);
      expect(result.emailsAdded).toBe(0);
      expect(result.addressesAdded).toBe(0);
      expect(result.socialsAdded).toBe(0);
      expect(result.demographicsUpdated).toBe(false);
    });

    it('should skip invalid phone numbers', async () => {
      mockRealEstateApi.skipTrace.mockResolvedValue({
        success: true,
        match_score: 0.8,
        output: {
          phones: [
            { phone_number: '123' }, // Too short
            { phone_number: '+1234567890' }, // Valid
          ],
        },
      });

      const result = await service.enrichPersona(mockJob);

      expect(result.phonesAdded).toBe(1);
    });

    it('should skip addresses without required fields', async () => {
      mockRealEstateApi.skipTrace.mockResolvedValue({
        success: true,
        match_score: 0.8,
        output: {
          addresses: [
            { street_address: '123 Main St' }, // Missing city, state, zip
            { street_address: '456 Oak Ave', city: 'Chicago', state: 'IL', zip: '60601' }, // Valid
          ],
        },
      });

      const result = await service.enrichPersona(mockJob);

      expect(result.addressesAdded).toBe(1);
    });
  });

  describe('mapPhoneType', () => {
    it('should correctly map phone types', () => {
      // Access private method through prototype
      const mapPhoneType = (service as any).mapPhoneType.bind(service);

      expect(mapPhoneType('mobile')).toBe('mobile');
      expect(mapPhoneType('cell')).toBe('mobile');
      expect(mapPhoneType('landline')).toBe('landline');
      expect(mapPhoneType('land line')).toBe('landline');
      expect(mapPhoneType('voip')).toBe('voip');
      expect(mapPhoneType('other')).toBe('unknown');
      expect(mapPhoneType(undefined)).toBe('unknown');
    });
  });

  describe('mapEmailType', () => {
    it('should correctly map email types', () => {
      const mapEmailType = (service as any).mapEmailType.bind(service);

      expect(mapEmailType('personal')).toBe('personal');
      expect(mapEmailType('business')).toBe('business');
      expect(mapEmailType('work')).toBe('business');
      expect(mapEmailType('other')).toBe('unknown');
      expect(mapEmailType(undefined)).toBe('unknown');
    });
  });

  describe('mapAddressType', () => {
    it('should correctly map address types', () => {
      const mapAddressType = (service as any).mapAddressType.bind(service);

      expect(mapAddressType('residential')).toBe('residential');
      expect(mapAddressType('home')).toBe('residential');
      expect(mapAddressType('commercial')).toBe('commercial');
      expect(mapAddressType('business')).toBe('commercial');
      expect(mapAddressType('mailing')).toBe('mailing');
      expect(mapAddressType('po box')).toBe('po_box');
      expect(mapAddressType('other')).toBe('unknown');
      expect(mapAddressType(undefined)).toBe('unknown');
    });
  });

  describe('mapPlatform', () => {
    it('should correctly map social platforms', () => {
      const mapPlatform = (service as any).mapPlatform.bind(service);

      expect(mapPlatform('LinkedIn')).toBe('linkedin');
      expect(mapPlatform('Facebook')).toBe('facebook');
      expect(mapPlatform('Twitter')).toBe('twitter');
      expect(mapPlatform('x.com')).toBe('twitter');
      expect(mapPlatform('Instagram')).toBe('instagram');
      expect(mapPlatform('TikTok')).toBe('other');
    });
  });
});

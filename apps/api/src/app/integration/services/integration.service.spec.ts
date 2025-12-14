import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService } from './integration.service';
import { TeamService } from '@/app/team/services/team.service';
import { ZohoService } from './zoho.service';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let mockDb: any;
  let mockTeamService: any;
  let mockZohoService: any;
  let mockConfigService: any;

  const mockIntegration = {
    id: 'integration-123',
    teamId: 'team-123',
    name: 'zoho',
    enabled: true,
    authData: {
      access_token: 'access-token-123',
      refresh_token: 'refresh-token-123',
      expires_in: 3600,
    },
    tokenExpiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: 'team-123',
    slug: 'test-team',
    name: 'Test Team',
    ownerId: 'user-123',
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        integrations: {
          findFirst: jest.fn().mockResolvedValue(mockIntegration),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    mockTeamService = {
      findById: jest.fn().mockResolvedValue(mockTeam),
    };

    mockZohoService = {
      connect: jest.fn().mockReturnValue('https://zoho.com/oauth'),
      generateToken: jest.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
        {
          provide: ZohoService,
          useValue: mockZohoService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneOrFail', () => {
    it('should find integration by id', async () => {
      const result = await service.findOneOrFail({
        id: 'integration-123',
        teamId: 'team-123',
      });

      expect(result).toEqual(mockIntegration);
      expect(mockDb.query.integrations.findFirst).toHaveBeenCalled();
    });

    it('should find integration by name', async () => {
      const result = await service.findOneOrFail({
        id: 'zoho',
        teamId: 'team-123',
      });

      expect(result).toEqual(mockIntegration);
    });

    it('should throw when integration not found', async () => {
      mockDb.query.integrations.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneOrFail({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow();
    });
  });

  describe('connect', () => {
    it('should return Zoho OAuth URL', () => {
      const result = service.connect('team-123');

      expect(result).toBe('https://zoho.com/oauth');
      expect(mockZohoService.connect).toHaveBeenCalledWith('team-123');
    });
  });

  describe('authorize', () => {
    it('should authorize and store integration credentials', async () => {
      const options = {
        code: 'auth-code-123',
        state: 'state-123',
      };

      const result = await service.authorize('team-123', options);

      expect(mockTeamService.findById).toHaveBeenCalledWith('team-123');
      expect(mockZohoService.generateToken).toHaveBeenCalledWith(options);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.uri).toBe('http://localhost:3000/t/test-team/integrations/crm');
    });

    it('should handle Axios errors gracefully', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = { data: 'Error details' } as any;
      mockZohoService.generateToken.mockRejectedValue(axiosError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        service.authorize('team-123', { code: 'invalid-code' }),
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Error details');
      consoleSpy.mockRestore();
    });

    it('should throw non-Axios errors', async () => {
      mockZohoService.generateToken.mockRejectedValue(new Error('Generic error'));

      await expect(
        service.authorize('team-123', { code: 'code' }),
      ).rejects.toThrow('Generic error');
    });
  });
});

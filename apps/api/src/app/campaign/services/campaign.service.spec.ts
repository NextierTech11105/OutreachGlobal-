import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { CampaignRepository } from '../repositories/campaign.repository';
import { DatabaseService } from '@/database/services/database.service';
import { LeadService } from '@/app/lead/services/lead.service';
import { InternalServerErrorException } from '@nestjs/common';
import { ModelNotFoundError } from '@/database/exceptions';
import { CampaignStatus, CampaignSequenceStatus } from '@nextier/common';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('CampaignService', () => {
  let service: CampaignService;
  let mockDb: any;
  let mockRepository: any;
  let mockDbService: any;
  let mockLeadService: any;

  const mockCampaign = {
    id: 'campaign-123',
    teamId: 'team-123',
    name: 'Test Campaign',
    status: CampaignStatus.SCHEDULED,
    minScore: 30,
    maxScore: 70,
    estimatedLeadsCount: 100,
    startsAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSequence = {
    id: 'sequence-123',
    campaignId: 'campaign-123',
    type: 'EMAIL',
    delayMinutes: 60,
    templateId: 'template-123',
  };

  const mockLead = {
    id: 'lead-123',
    teamId: 'team-123',
    score: 50,
  };

  beforeEach(async () => {
    mockDb = {
      transaction: jest.fn((callback) => callback({
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue(undefined),
        }),
        query: {
          leads: {
            findMany: jest.fn().mockResolvedValue([mockLead]),
          },
        },
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      })),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockCampaign]),
          }),
        }),
      }),
    };

    mockRepository = {
      findMany: jest.fn().mockReturnValue({
        $dynamic: jest.fn().mockReturnThis(),
      }),
      findById: jest.fn().mockResolvedValue(mockCampaign),
      create: jest.fn().mockResolvedValue(mockCampaign),
      update: jest.fn().mockResolvedValue(mockCampaign),
      remove: jest.fn().mockResolvedValue(mockCampaign),
    };

    mockDbService = {
      withCursorPagination: jest.fn().mockResolvedValue({
        edges: [{ node: mockCampaign, cursor: 'cursor-1' }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: 'cursor-1',
        },
      }),
    };

    mockLeadService = {
      count: jest.fn().mockResolvedValue(100),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: CampaignRepository,
          useValue: mockRepository,
        },
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
        {
          provide: LeadService,
          useValue: mockLeadService,
        },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('paginate', () => {
    it('should return paginated campaigns', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
      };

      const result = await service.paginate(options);

      expect(mockRepository.findMany).toHaveBeenCalledWith(options);
      expect(mockDbService.withCursorPagination).toHaveBeenCalled();
      expect(result.edges).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });
  });

  describe('findOneOrFail', () => {
    it('should return campaign when found', async () => {
      const result = await service.findOneOrFail({
        id: 'campaign-123',
        teamId: 'team-123',
      });

      expect(result).toEqual(mockCampaign);
      expect(mockRepository.findById).toHaveBeenCalled();
    });

    it('should throw when campaign not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findOneOrFail({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow();
    });
  });

  describe('reestimateLeadsCount', () => {
    it('should update estimated leads count', async () => {
      mockLeadService.count.mockResolvedValue(150);

      const result = await service.reestimateLeadsCount({
        id: 'campaign-123',
        teamId: 'team-123',
      });

      expect(mockLeadService.count).toHaveBeenCalledWith({
        teamId: mockCampaign.teamId,
        minScore: mockCampaign.minScore,
        maxScore: mockCampaign.maxScore,
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: mockCampaign.id },
        { estimatedLeadsCount: 150 },
      );
    });
  });

  describe('create', () => {
    it('should create campaign with sequences and eligible leads', async () => {
      const input = {
        name: 'New Campaign',
        minScore: 30,
        maxScore: 70,
        sequences: [
          {
            type: 'EMAIL',
            delayMinutes: 60,
            templateId: 'template-123',
          },
        ],
      };

      const result = await service.create({
        teamId: 'team-123',
        input: input as any,
      });

      expect(result.campaign).toBeDefined();
      expect(mockLeadService.count).toHaveBeenCalled();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle campaign creation with no eligible leads', async () => {
      mockDb.transaction.mockImplementation((callback) =>
        callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
          query: {
            leads: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        }),
      );

      const input = {
        name: 'New Campaign',
        minScore: 90,
        maxScore: 100,
        sequences: [],
      };

      const result = await service.create({
        teamId: 'team-123',
        input: input as any,
      });

      expect(result.campaign).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update campaign and sequences', async () => {
      const input = {
        name: 'Updated Campaign',
        minScore: 40,
        maxScore: 80,
        sequences: [
          {
            id: 'sequence-123',
            type: 'EMAIL',
            delayMinutes: 120,
            templateId: 'template-456',
          },
          {
            type: 'SMS',
            delayMinutes: 30,
            templateId: 'template-789',
          },
        ],
      };

      const result = await service.update({
        id: 'campaign-123',
        teamId: 'team-123',
        input: input as any,
      });

      expect(result.campaign).toBeDefined();
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete campaign and return id', async () => {
      const result = await service.remove({
        id: 'campaign-123',
        teamId: 'team-123',
      });

      expect(result.deletedCampaignId).toBe('campaign-123');
      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should throw when campaign not found', async () => {
      mockRepository.remove.mockResolvedValue(null);

      await expect(
        service.remove({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('toggle', () => {
    it('should pause an active campaign', async () => {
      const activeCampaign = { ...mockCampaign, status: CampaignStatus.ACTIVE };
      mockRepository.findById.mockResolvedValue(activeCampaign);

      const pausedCampaign = { ...activeCampaign, status: CampaignStatus.PAUSED };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([pausedCampaign]),
          }),
        }),
      });

      const result = await service.toggle({
        id: 'campaign-123',
        teamId: 'team-123',
      });

      expect(result.campaign.status).toBe(CampaignStatus.PAUSED);
    });

    it('should activate a paused campaign', async () => {
      const pausedCampaign = { ...mockCampaign, status: CampaignStatus.PAUSED };
      mockRepository.findById.mockResolvedValue(pausedCampaign);

      const activeCampaign = { ...pausedCampaign, status: CampaignStatus.ACTIVE };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([activeCampaign]),
          }),
        }),
      });

      const result = await service.toggle({
        id: 'campaign-123',
        teamId: 'team-123',
      });

      expect(result.campaign.status).toBe(CampaignStatus.ACTIVE);
    });

    it('should throw when campaign not found during toggle', async () => {
      mockRepository.findById.mockResolvedValue(mockCampaign);
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.toggle({ id: 'campaign-123', teamId: 'team-123' }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });
});

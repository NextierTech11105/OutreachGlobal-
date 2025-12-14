import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from './lead.service';
import { DatabaseService } from '@/database/services/database.service';
import { EventBus } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { ModelNotFoundError } from '@/database/exceptions';
import { LeadCreated } from '../events/lead-created.event';
import { LeadUpdated } from '../events/lead-updated.event';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('LeadService', () => {
  let service: LeadService;
  let mockDb: any;
  let mockDbService: any;
  let mockEventBus: any;

  const mockLead = {
    id: 'lead-123',
    teamId: 'team-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Test Corp',
    status: 'NEW',
    score: 50,
    tags: ['hot', 'enterprise'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLeadPhoneNumber = {
    id: 'phone-123',
    leadId: 'lead-123',
    phoneNumber: '+1987654321',
    label: 'Work',
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        leads: {
          findFirst: jest.fn(),
        },
      },
      select: jest.fn().mockReturnThis(),
      selectDistinct: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([]),
      $dynamic: jest.fn().mockReturnThis(),
      $count: jest.fn().mockResolvedValue(0),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockLead]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockLead]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: mockLead.id }]),
        }),
      }),
    };

    mockDbService = {
      withCursorPagination: jest.fn().mockResolvedValue({
        edges: [{ node: mockLead, cursor: 'cursor-1' }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: 'cursor-1',
        },
      }),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('paginate', () => {
    it('should return paginated leads', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
      };

      const result = await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDbService.withCursorPagination).toHaveBeenCalled();
      expect(result.edges).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    it('should filter by tags when provided', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
        tags: ['hot'],
      };

      await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter by phone presence when hasPhone is true', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
        hasPhone: true,
      };

      await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter by search query when provided', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
        searchQuery: 'John',
      };

      await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return total lead count', async () => {
      mockDb.from.mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total: 100 }]),
      });

      const result = await service.count({ teamId: 'team-123' });

      expect(result).toBe(100);
    });

    it('should filter by score range when provided', async () => {
      mockDb.from.mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total: 50 }]),
      });

      const result = await service.count({
        teamId: 'team-123',
        minScore: 30,
        maxScore: 70,
      });

      expect(result).toBe(50);
    });

    it('should return 0 when no leads found', async () => {
      mockDb.from.mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total: null }]),
      });

      const result = await service.count({ teamId: 'team-123' });

      expect(result).toBe(0);
    });
  });

  describe('getStatuses', () => {
    it('should return distinct lead statuses', async () => {
      mockDb.orderBy = undefined;
      mockDb.where.mockResolvedValue([
        { status: 'NEW' },
        { status: 'CONTACTED' },
        { status: 'QUALIFIED' },
      ]);

      const result = await service.getStatuses('team-123');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'NEW' });
    });
  });

  describe('getTags', () => {
    it('should return distinct tags', async () => {
      mockDb.orderBy.mockResolvedValue([
        { tag: 'enterprise' },
        { tag: 'hot' },
        { tag: 'priority' },
      ]);

      const result = await service.getTags('team-123');

      expect(result).toEqual(['enterprise', 'hot', 'priority']);
    });
  });

  describe('findOneOrFail', () => {
    it('should return lead when found', async () => {
      mockDb.query.leads.findFirst.mockResolvedValue(mockLead);

      const result = await service.findOneOrFail({
        id: 'lead-123',
        teamId: 'team-123',
      });

      expect(result).toEqual(mockLead);
    });

    it('should throw when lead not found', async () => {
      mockDb.query.leads.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneOrFail({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new lead and publish event', async () => {
      const result = await service.create({
        teamId: 'team-123',
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      expect(result.lead).toEqual(mockLead);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(LeadCreated));
    });
  });

  describe('update', () => {
    it('should update lead and publish event', async () => {
      const result = await service.update({
        id: 'lead-123',
        teamId: 'team-123',
        input: { firstName: 'Jane' },
      });

      expect(result.lead).toEqual(mockLead);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(LeadUpdated));
    });

    it('should throw ModelNotFoundError when lead not found', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.update({
          id: 'nonexistent',
          teamId: 'team-123',
          input: { firstName: 'Jane' },
        }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete lead and return id', async () => {
      const result = await service.remove({
        id: 'lead-123',
        teamId: 'team-123',
      });

      expect(result.deletedLeadId).toBe('lead-123');
    });

    it('should throw ModelNotFoundError when lead not found', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.remove({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('bulkRemove', () => {
    it('should delete multiple leads', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.bulkRemove({
        leadIds: ['lead-1', 'lead-2', 'lead-3'],
        teamId: 'team-123',
      });

      expect(result.deletedLeadsCount).toBe(3);
    });
  });

  describe('createPhoneNumber', () => {
    it('should create phone number when under limit', async () => {
      mockDb.$count.mockResolvedValue(2);
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockLeadPhoneNumber]),
        }),
      });

      const result = await service.createPhoneNumber({
        teamId: 'team-123',
        leadId: 'lead-123',
        input: { phone: '+1987654321', label: 'Work' },
      });

      expect(result.leadPhoneNumber).toEqual(mockLeadPhoneNumber);
    });

    it('should throw BadRequestException when at limit', async () => {
      mockDb.$count.mockResolvedValue(3);

      await expect(
        service.createPhoneNumber({
          teamId: 'team-123',
          leadId: 'lead-123',
          input: { phone: '+1987654321', label: 'Work' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePhoneNumber', () => {
    it('should update phone number label', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockLeadPhoneNumber]),
          }),
        }),
      });

      const result = await service.updatePhoneNumber({
        teamId: 'team-123',
        leadId: 'lead-123',
        leadPhoneNumberId: 'phone-123',
        label: 'Mobile',
      });

      expect(result.leadPhoneNumber).toEqual(mockLeadPhoneNumber);
    });

    it('should throw when phone number not found', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.updatePhoneNumber({
          teamId: 'team-123',
          leadId: 'lead-123',
          leadPhoneNumberId: 'nonexistent',
          label: 'Mobile',
        }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('removePhoneNumber', () => {
    it('should delete phone number', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'phone-123' }]),
        }),
      });

      const result = await service.removePhoneNumber({
        teamId: 'team-123',
        leadId: 'lead-123',
        leadPhoneNumberId: 'phone-123',
      });

      expect(result.deletedLeadPhoneNumberId).toBe('phone-123');
    });

    it('should throw when phone number not found', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.removePhoneNumber({
          teamId: 'team-123',
          leadId: 'lead-123',
          leadPhoneNumberId: 'nonexistent',
        }),
      ).rejects.toThrow(ModelNotFoundError);
    });
  });
});

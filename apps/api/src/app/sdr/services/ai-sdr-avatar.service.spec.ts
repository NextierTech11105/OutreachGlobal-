import { Test, TestingModule } from '@nestjs/testing';
import { AiSdrAvatarService } from './ai-sdr-avatar.service';
import { DatabaseService } from '@/database/services/database.service';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('AiSdrAvatarService', () => {
  let service: AiSdrAvatarService;
  let mockDb: any;
  let mockDbService: any;

  const mockAvatar = {
    id: 'avatar-123',
    teamId: 'team-123',
    name: 'Sales Pro',
    description: 'A professional sales assistant',
    industry: 'Technology',
    tone: 'professional',
    personality: 'friendly',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        aiSdrAvatars: {
          findFirst: jest.fn().mockResolvedValue(mockAvatar),
        },
      },
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      $dynamic: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAvatar]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockAvatar]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockDbService = {
      withCursorPagination: jest.fn().mockResolvedValue({
        edges: [{ node: mockAvatar, cursor: 'cursor-1' }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: 'cursor-1',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSdrAvatarService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    service = module.get<AiSdrAvatarService>(AiSdrAvatarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('paginate', () => {
    it('should return paginated avatars', async () => {
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

    it('should filter by search query when provided', async () => {
      const options = {
        teamId: 'team-123',
        first: 10,
        searchQuery: 'Sales',
      };

      await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOneOrFail', () => {
    it('should return avatar when found', async () => {
      const result = await service.findOneOrFail({
        id: 'avatar-123',
        teamId: 'team-123',
      });

      expect(result).toEqual(mockAvatar);
      expect(mockDb.query.aiSdrAvatars.findFirst).toHaveBeenCalled();
    });

    it('should throw when avatar not found', async () => {
      mockDb.query.aiSdrAvatars.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneOrFail({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new AI SDR avatar', async () => {
      const result = await service.create({
        teamId: 'team-123',
        input: {
          name: 'New Avatar',
          description: 'A new sales avatar',
          personality: 'friendly',
          voiceType: 'professional',
          active: true,
          industry: 'Healthcare',
          mission: 'Help customers find solutions',
          goal: 'Increase conversions',
          roles: ['Sales', 'Support'],
          faqs: [{ question: 'What do you do?', answer: 'I help with sales.' }],
          tags: ['healthcare', 'sales'],
        },
      });

      expect(result.avatar).toEqual(mockAvatar);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing avatar', async () => {
      const result = await service.update({
        id: 'avatar-123',
        teamId: 'team-123',
        input: {
          name: 'Updated Avatar',
          description: 'Updated description',
          personality: 'professional',
          voiceType: 'warm',
          active: true,
          industry: 'Technology',
          mission: 'Updated mission',
          goal: 'Updated goal',
          roles: ['Sales'],
          faqs: [{ question: 'Updated Q', answer: 'Updated A' }],
          tags: ['updated'],
        },
      });

      expect(result.avatar).toEqual(mockAvatar);
      expect(mockDb.query.aiSdrAvatars.findFirst).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw when avatar not found for update', async () => {
      mockDb.query.aiSdrAvatars.findFirst.mockResolvedValue(null);

      await expect(
        service.update({
          id: 'nonexistent',
          teamId: 'team-123',
          input: {
            name: 'Updated',
            personality: 'friendly',
            voiceType: 'casual',
            active: true,
            industry: 'Tech',
            mission: 'Test mission',
            goal: 'Test goal',
            roles: ['Test'],
            faqs: [],
            tags: [],
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete an avatar', async () => {
      const result = await service.remove({
        id: 'avatar-123',
        teamId: 'team-123',
      });

      expect(result.id).toBe('avatar-123');
      expect(mockDb.query.aiSdrAvatars.findFirst).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw when avatar not found for deletion', async () => {
      mockDb.query.aiSdrAvatars.findFirst.mockResolvedValue(null);

      await expect(
        service.remove({ id: 'nonexistent', teamId: 'team-123' }),
      ).rejects.toThrow();
    });
  });
});

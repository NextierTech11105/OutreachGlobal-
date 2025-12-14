import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { AuthService } from '@/app/auth/services/auth.service';
import { DEFAULT_DB_PROVIDER_NAME } from '@haorama/drizzle-postgres-nestjs';

describe('UserService', () => {
  let service: UserService;
  let authService: AuthService;
  let mockDb: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: 'user',
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: AuthService,
          useValue: {
            attempt: jest.fn().mockResolvedValue({ user: mockUser }),
            accessToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should authenticate user and return token', async () => {
      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock-token');
      expect(authService.attempt).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(authService.accessToken).toHaveBeenCalledWith(mockUser);
    });

    it('should propagate auth service errors', async () => {
      (authService.attempt as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const result = await service.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result).toEqual([mockUser]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create user within a transaction session', async () => {
      const mockSession = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      };

      const result = await service.create(
        {
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        },
        mockSession as any,
      );

      expect(result).toEqual([mockUser]);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const result = await service.updateProfile('user-123', {
        name: 'Updated Name',
      });

      expect(result.user).toEqual(mockUser);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle name updates', async () => {
      const result = await service.updateProfile('user-123', {
        name: 'New Full Name',
      });

      expect(result.user).toEqual(mockUser);
    });
  });
});

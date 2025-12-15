import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@/lib/jwt/jwt.service";
import { BadRequestException } from "@nestjs/common";
import { ModelNotFoundError } from "@/database/exceptions";
import { WrongJtiError } from "@/lib/jwt/jwt.errors";
import { DEFAULT_DB_PROVIDER_NAME } from "@haorama/drizzle-postgres-nestjs";

// Mock the hash utility
jest.mock("@/common/utils/hash", () => ({
  hashVerify: jest.fn(),
}));

import { hashVerify } from "@/common/utils/hash";

describe("AuthService", () => {
  let service: AuthService;
  let jwtService: JwtService;
  let mockDb: any;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    password: "hashed-password",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersonalAccessToken = {
    id: "token-123",
    userId: "user-123",
    name: "WEBSITE",
    expiredAt: new Date(),
    lastUsedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        users: {
          findFirst: jest.fn(),
        },
        personalAccessTokens: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockPersonalAccessToken]),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockResolvedValue("mock-jwt-token"),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("attempt", () => {
    it("should successfully authenticate with valid credentials", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);
      (hashVerify as jest.Mock).mockResolvedValue(true);

      const result = await service.attempt({
        email: "test@example.com",
        password: "correct-password",
      });

      expect(result.user).toEqual(mockUser);
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
      expect(hashVerify).toHaveBeenCalledWith(
        "hashed-password",
        "correct-password",
      );
    });

    it("should throw BadRequestException for wrong password", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);
      (hashVerify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.attempt({
          email: "test@example.com",
          password: "wrong-password",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when user not found", async () => {
      // Mock findFirst to return a thenable that throws when orFail processes null
      mockDb.query.users.findFirst.mockReturnValue({
        then: (resolve: any) => Promise.resolve(null).then(resolve),
      });

      await expect(
        service.attempt({
          email: "nonexistent@example.com",
          password: "password",
        }),
      ).rejects.toBeInstanceOf(ModelNotFoundError);
    });
  });

  describe("accessToken", () => {
    it("should generate an access token for a user", async () => {
      const result = await service.accessToken(mockUser as any);

      expect(result.token).toBe("mock-jwt-token");
      expect(mockDb.insert).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sub: mockUser.id,
            username: mockUser.email,
          }),
        }),
      );
    });

    it("should use custom token name when provided", async () => {
      await service.accessToken(mockUser as any, { name: "MOBILE" as any });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("getUser", () => {
    const validPayload = {
      jti: "token-123",
      sub: "user-123",
      username: "test@example.com",
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    it("should return user for valid token payload", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);
      mockDb.query.personalAccessTokens.findFirst.mockResolvedValue(
        mockPersonalAccessToken,
      );

      const result = await service.getUser(validPayload);

      expect(result).toEqual(mockUser);
    });

    it("should throw WrongJtiError for missing jti", async () => {
      await expect(
        service.getUser({ ...validPayload, jti: undefined as any }),
      ).rejects.toThrow(WrongJtiError);
    });

    it("should throw WrongJtiError for missing sub", async () => {
      await expect(
        service.getUser({ ...validPayload, sub: undefined as any }),
      ).rejects.toThrow(WrongJtiError);
    });

    it("should throw ModelNotFoundError when user not found", async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.getUser(validPayload)).rejects.toBeInstanceOf(
        ModelNotFoundError,
      );
    });
  });

  describe("revoke", () => {
    const validPayload = {
      jti: "token-123",
      sub: "user-123",
      username: "test@example.com",
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    it("should revoke token successfully", async () => {
      const result = await service.revoke(validPayload);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should throw WrongJtiError for invalid payload", async () => {
      await expect(
        service.revoke({ ...validPayload, jti: undefined as any }),
      ).rejects.toThrow(WrongJtiError);
    });
  });
});

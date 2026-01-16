import { Test, TestingModule } from "@nestjs/testing";
import { IntegrationService } from "./integration.service";
import { TeamService } from "@/app/team/services/team.service";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_DB_PROVIDER_NAME } from "@haorama/drizzle-postgres-nestjs";

describe("IntegrationService", () => {
  let service: IntegrationService;
  let mockDb: any;
  let mockTeamService: any;
  let mockConfigService: any;

  const mockIntegration = {
    id: "integration-123",
    teamId: "team-123",
    name: "stripe",
    enabled: true,
    authData: {
      access_token: "access-token-123",
    },
    tokenExpiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: "team-123",
    slug: "test-team",
    name: "Test Team",
    ownerId: "user-123",
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        integrations: {
          findFirst: jest.fn().mockResolvedValue(mockIntegration),
          findMany: jest.fn().mockResolvedValue([mockIntegration]),
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

    mockConfigService = {
      get: jest.fn().mockReturnValue("http://localhost:3000"),
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

  describe("findOneOrFail", () => {
    it("should find integration by id", async () => {
      const result = await service.findOneOrFail({
        id: "integration-123",
        teamId: "team-123",
      });

      expect(result).toEqual(mockIntegration);
      expect(mockDb.query.integrations.findFirst).toHaveBeenCalled();
    });

    it("should find integration by name", async () => {
      const result = await service.findOneOrFail({
        id: "stripe",
        teamId: "team-123",
      });

      expect(result).toEqual(mockIntegration);
    });

    it("should throw when integration not found", async () => {
      mockDb.query.integrations.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneOrFail({ id: "nonexistent", teamId: "team-123" }),
      ).rejects.toThrow();
    });
  });

  describe("findByTeam", () => {
    it("should return all integrations for a team", async () => {
      const result = await service.findByTeam("team-123");

      expect(result).toEqual([mockIntegration]);
      expect(mockDb.query.integrations.findMany).toHaveBeenCalled();
    });
  });

  describe("connect", () => {
    it("should throw for unimplemented provider", () => {
      expect(() => service.connect("team-123", "hubspot")).toThrow(
        "Provider hubspot not yet implemented",
      );
    });
  });

  describe("authorize", () => {
    it("should throw for unimplemented provider", async () => {
      await expect(
        service.authorize("team-123", "hubspot", { code: "auth-code" }),
      ).rejects.toThrow("Provider hubspot not yet implemented");
    });
  });

  describe("upsertIntegration", () => {
    it("should upsert integration record", async () => {
      await service.upsertIntegration("team-123", "stripe", {
        api_key: "sk_test_123",
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});

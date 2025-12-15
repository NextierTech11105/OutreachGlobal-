import { Test, TestingModule } from "@nestjs/testing";
import { TeamService } from "./team.service";
import { DEFAULT_DB_PROVIDER_NAME } from "@haorama/drizzle-postgres-nestjs";

describe("TeamService", () => {
  let service: TeamService;
  let mockDb: any;

  const mockTeam = {
    id: "team-123",
    slug: "test-team",
    name: "Test Team",
    ownerId: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        teams: {
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("should find team by id", async () => {
      mockDb.query.teams.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findById("team-123");

      expect(result).toEqual(mockTeam);
      expect(mockDb.query.teams.findFirst).toHaveBeenCalled();
    });

    it("should find team by slug", async () => {
      mockDb.query.teams.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findById("test-team");

      expect(result).toEqual(mockTeam);
    });

    it("should throw when team not found", async () => {
      mockDb.query.teams.findFirst.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow();
    });
  });

  describe("findByUserId", () => {
    it("should find team by owner user id", async () => {
      mockDb.query.teams.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findByUserId("user-123");

      expect(result).toEqual(mockTeam);
    });

    it("should return undefined when no team found for user", async () => {
      mockDb.query.teams.findFirst.mockResolvedValue(undefined);

      const result = await service.findByUserId("user-without-team");

      expect(result).toBeUndefined();
    });
  });
});

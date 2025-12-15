import { Test, TestingModule } from "@nestjs/testing";
import { MessageService } from "./message.service";
import { DatabaseService } from "@/database/services/database.service";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { LeadService } from "@/app/lead/services/lead.service";
import { SendgridService } from "@/app/team/services/sendgrid.service";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { MessageType, MessageDirection } from "@nextier/common";
import { DEFAULT_DB_PROVIDER_NAME } from "@haorama/drizzle-postgres-nestjs";

// Mock the render function
jest.mock("@react-email/render", () => ({
  render: jest.fn().mockResolvedValue("<html>Test Email</html>"),
}));

describe("MessageService", () => {
  let service: MessageService;
  let mockDb: any;
  let mockDbService: any;
  let mockSettingService: any;
  let mockLeadService: any;
  let mockSendgridService: any;
  let mockTwilioService: any;

  const mockMessage = {
    id: "message-123",
    teamId: "team-123",
    type: MessageType.EMAIL,
    direction: MessageDirection.OUTBOUND,
    fromAddress: "sender@example.com",
    fromName: "Sender",
    toAddress: "recipient@example.com",
    toName: "Recipient",
    subject: "Test Subject",
    body: "Test Body",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings = {
    sendgridApiKey: "sg-api-key",
    sendgridFromEmail: "sender@example.com",
    sendgridFromName: "Company Name",
    twilioAccountSid: "AC123",
    twilioAuthToken: "auth-token",
    twilioDefaultPhoneNumber: "+1234567890",
  };

  const mockLead = {
    id: "lead-123",
    teamId: "team-123",
    firstName: "John",
    lastName: "Doe",
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      $dynamic: jest.fn().mockReturnThis(),
      transaction: jest.fn((callback) =>
        callback({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([mockMessage]),
            }),
          }),
        }),
      ),
    };

    mockDbService = {
      withCursorPagination: jest.fn().mockResolvedValue({
        edges: [{ node: mockMessage, cursor: "cursor-1" }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "cursor-1",
          endCursor: "cursor-1",
        },
      }),
    };

    mockSettingService = {
      getMapped: jest.fn().mockResolvedValue(mockSettings),
    };

    mockLeadService = {
      findOneOrFail: jest.fn().mockResolvedValue(mockLead),
    };

    mockSendgridService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    mockTwilioService = {
      sendSms: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: DEFAULT_DB_PROVIDER_NAME,
          useValue: mockDb,
        },
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
        {
          provide: TeamSettingService,
          useValue: mockSettingService,
        },
        {
          provide: LeadService,
          useValue: mockLeadService,
        },
        {
          provide: SendgridService,
          useValue: mockSendgridService,
        },
        {
          provide: TwilioService,
          useValue: mockTwilioService,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("paginate", () => {
    it("should return paginated messages", async () => {
      const options = {
        teamId: "team-123",
        first: 10,
      };

      const result = await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDbService.withCursorPagination).toHaveBeenCalled();
      expect(result.edges).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    it("should filter by direction when provided", async () => {
      const options = {
        teamId: "team-123",
        first: 10,
        direction: MessageDirection.OUTBOUND,
      };

      await service.paginate(options);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    describe("email messages", () => {
      it("should create and send an email message", async () => {
        const options = {
          teamId: "team-123",
          type: MessageType.EMAIL,
          input: {
            toName: "Recipient",
            toAddress: "recipient@example.com",
            subject: "Test Subject",
            body: "Test Body",
          },
        };

        const result = await service.create(options);

        expect(result.message).toBeDefined();
        expect(mockSettingService.getMapped).toHaveBeenCalledWith("team-123");
        expect(mockSendgridService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: mockSettings.sendgridApiKey,
            data: expect.objectContaining({
              to: "recipient@example.com",
              from: mockSettings.sendgridFromEmail,
              subject: "Test Subject",
            }),
          }),
        );
      });

      it("should use default subject when not provided", async () => {
        const options = {
          teamId: "team-123",
          type: MessageType.EMAIL,
          input: {
            toName: "John",
            toAddress: "john@example.com",
            subject: "Hello John",
            body: "Test Body",
          },
        };

        const result = await service.create(options);

        expect(result.message).toBeDefined();
        expect(mockSendgridService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              subject: "Hello John",
            }),
          }),
        );
      });

      it("should associate message with lead when leadId provided", async () => {
        const options = {
          teamId: "team-123",
          type: MessageType.EMAIL,
          leadId: "lead-123",
          input: {
            toName: "Recipient",
            toAddress: "recipient@example.com",
            subject: "Test Subject",
            body: "Test Body",
          },
        };

        await service.create(options);

        expect(mockLeadService.findOneOrFail).toHaveBeenCalledWith({
          teamId: "team-123",
          id: "lead-123",
        });
      });
    });

    describe("SMS messages", () => {
      it("should create and send an SMS message", async () => {
        const options = {
          teamId: "team-123",
          type: MessageType.SMS,
          input: {
            toName: "Recipient",
            toAddress: "+1987654321",
            subject: "SMS",
            body: "Test SMS Body",
          },
        };

        const result = await service.create(options);

        expect(result.message).toBeDefined();
        expect(mockTwilioService.sendSms).toHaveBeenCalledWith(
          expect.objectContaining({
            accountSid: mockSettings.twilioAccountSid,
            authToken: mockSettings.twilioAuthToken,
            from: mockSettings.twilioDefaultPhoneNumber,
            to: "+1987654321",
            body: "Test SMS Body",
          }),
        );
      });
    });

    it("should rollback transaction on error", async () => {
      mockSendgridService.send.mockRejectedValue(new Error("Send failed"));

      const options = {
        teamId: "team-123",
        type: MessageType.EMAIL,
        input: {
          toName: "Recipient",
          toAddress: "recipient@example.com",
          subject: "Test Subject",
          body: "Test Body",
        },
      };

      await expect(service.create(options)).rejects.toThrow();
    });
  });
});

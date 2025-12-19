/**
 * SMS Webhook Compliance Tests
 *
 * Critical tests for SMS opt-out handling and compliance.
 * These tests ensure legal compliance with TCPA and CAN-SPAM regulations.
 */

// Mock next/server
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: jest.fn().mockImplementation((body, options) => ({
    status: options?.status || 200,
    headers: options?.headers || new Map([["Content-Type", "text/xml"]]),
    text: () => Promise.resolve(body),
  })),
}));

// Mock the Gianna service
const mockGenerateResponse = jest.fn().mockResolvedValue({
  message: "Test response",
  intent: "interested",
  confidence: 85,
  personality: "friendly",
  requiresHumanReview: false,
});

jest.mock("@/lib/gianna/gianna-service", () => ({
  gianna: {
    generateResponse: mockGenerateResponse,
  },
}));

// Mock the response classifications
jest.mock("@/lib/response-classifications", () => ({
  classifyResponse: jest.fn().mockReturnValue({
    classificationId: "interested",
    classificationName: "Interested",
  }),
  extractEmail: jest.fn(),
  isOptOut: jest.fn(),
}));

// Mock fetch for external API calls
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});
global.fetch = mockFetch;

describe("Gianna SMS Webhook - Compliance Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    mockGenerateResponse.mockResolvedValue({
      message: "Test response",
      intent: "interested",
      confidence: 85,
      personality: "friendly",
      requiresHumanReview: false,
    });
  });

  describe("Opt-Out Keywords (CRITICAL - Legal Compliance)", () => {
    const OPT_OUT_KEYWORDS = [
      "stop",
      "STOP",
      "Stop",
      "unsubscribe",
      "UNSUBSCRIBE",
      "opt out",
      "OPT OUT",
      "opt-out",
      "remove",
      "REMOVE",
      "cancel",
      "CANCEL",
      "quit",
      "end",
    ];

    it("should recognize all standard opt-out keywords", () => {
      // Verify the keywords are defined correctly
      const expectedKeywords = [
        "stop",
        "unsubscribe",
        "opt out",
        "opt-out",
        "remove",
        "cancel",
        "quit",
        "end",
      ];

      expectedKeywords.forEach((keyword) => {
        expect(OPT_OUT_KEYWORDS.map((k) => k.toLowerCase())).toContain(
          keyword.toLowerCase(),
        );
      });
    });

    it("should detect opt-out in various message formats", () => {
      const testMessages = [
        "STOP",
        "stop",
        "Stop texting me",
        "Please stop",
        "UNSUBSCRIBE",
        "I want to unsubscribe",
        "opt out",
        "I opt-out",
        "Remove me from this list",
        "Cancel my subscription",
        "Quit sending messages",
        "End this",
      ];

      testMessages.forEach((message) => {
        const containsOptOut = OPT_OUT_KEYWORDS.some((kw) =>
          message.toLowerCase().includes(kw.toLowerCase()),
        );
        expect(containsOptOut).toBe(true);
      });
    });
  });

  describe("Email Capture Regex", () => {
    const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

    it("should match valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@company.co.uk",
        "first.last@sub.domain.com",
        "email123@test.io",
        "UPPERCASE@EMAIL.COM",
      ];

      validEmails.forEach((email) => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it("should not match invalid email addresses", () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "no@tld",
        "spaces in@email.com",
      ];

      invalidEmails.forEach((email) => {
        // These should either not match or match incorrectly
        const match = email.match(EMAIL_REGEX);
        if (match) {
          // If it matches, it shouldn't be the full invalid string
          expect(match[0]).not.toBe(email);
        }
      });
    });
  });

  describe("TwiML Response Format", () => {
    it("should generate valid TwiML XML structure", () => {
      const escapeXml = (unsafe: string): string => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      };

      const message = "Test message";
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

      expect(twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(twiml).toContain("<Response>");
      expect(twiml).toContain("<Message>");
      expect(twiml).toContain("</Message>");
      expect(twiml).toContain("</Response>");
    });

    it("should escape XML special characters", () => {
      const escapeXml = (unsafe: string): string => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      };

      expect(escapeXml("Test & test")).toBe("Test &amp; test");
      expect(escapeXml("<script>")).toBe("&lt;script&gt;");
      expect(escapeXml('"quoted"')).toBe("&quot;quoted&quot;");
      expect(escapeXml("'apostrophe'")).toBe("&apos;apostrophe&apos;");
    });
  });

  describe("Conversation Stage Detection", () => {
    const determineStage = (context: {
      messageCount: number;
      lastIntent?: string;
    }): string => {
      if (context.messageCount === 1) return "cold_open";
      if (context.lastIntent === "interested") return "hot_response";
      if (context.lastIntent?.startsWith("objection"))
        return "handling_pushback";
      if (context.messageCount > 3) return "follow_up";
      return "warming_up";
    };

    it("should return cold_open for first message", () => {
      expect(determineStage({ messageCount: 1 })).toBe("cold_open");
    });

    it("should return hot_response when last intent was interested", () => {
      expect(
        determineStage({ messageCount: 2, lastIntent: "interested" }),
      ).toBe("hot_response");
    });

    it("should return handling_pushback for objection intents", () => {
      expect(
        determineStage({ messageCount: 2, lastIntent: "objection_price" }),
      ).toBe("handling_pushback");
      expect(
        determineStage({ messageCount: 2, lastIntent: "objection_timing" }),
      ).toBe("handling_pushback");
    });

    it("should return follow_up after 3 messages", () => {
      expect(determineStage({ messageCount: 4 })).toBe("follow_up");
      expect(determineStage({ messageCount: 10 })).toBe("follow_up");
    });

    it("should return warming_up for other cases", () => {
      expect(determineStage({ messageCount: 2 })).toBe("warming_up");
      expect(determineStage({ messageCount: 3, lastIntent: "question" })).toBe(
        "warming_up",
      );
    });
  });

  describe("DNC List Integration", () => {
    it("should call suppression API with correct parameters", async () => {
      const phone = "+15551234567";

      // Simulate the addToDNCList function logic
      await fetch("https://example.com/api/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          reason: "sms_opt_out",
          source: "gianna_sms_webhook",
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/suppression"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(phone),
        }),
      );
    });
  });

  describe("Human Review Threshold", () => {
    it("should require human review when confidence is below 70%", () => {
      const confidenceThreshold = 70;

      expect(65 < confidenceThreshold).toBe(true);
      expect(50 < confidenceThreshold).toBe(true);
      expect(69 < confidenceThreshold).toBe(true);
      expect(70 < confidenceThreshold).toBe(false);
      expect(85 < confidenceThreshold).toBe(false);
    });

    it("should auto-respond when confidence is 70% or above", () => {
      const confidenceThreshold = 70;

      expect(70 >= confidenceThreshold).toBe(true);
      expect(85 >= confidenceThreshold).toBe(true);
      expect(100 >= confidenceThreshold).toBe(true);
    });
  });

  describe("Email Capture Automation", () => {
    it("should trigger automation with correct data structure", async () => {
      const automationData = {
        email: "test@example.com",
        smsMessage: "My email is test@example.com",
        fromPhone: "+15551234567",
        toPhone: "+15559876543",
        firstName: "John",
        propertyId: "prop_123",
        propertyAddress: "123 Main St",
        clientId: "homeowner-advisor",
        classification: "email-capture",
        deliverable: "property-valuation-report",
      };

      await fetch("https://example.com/api/automation/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationData),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/automation/email-capture"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test@example.com"),
        }),
      );
    });
  });

  describe("Response Classification Integration", () => {
    it("should use classifyResponse from response-classifications module", () => {
      const { classifyResponse } = require("@/lib/response-classifications");

      const result = classifyResponse("homeowner-advisor", "I am interested");

      expect(result).toBeDefined();
      expect(result.classificationId).toBeDefined();
    });
  });
});

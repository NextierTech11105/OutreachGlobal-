// @ts-nocheck
// TODO: Fix test - needs jest-dom setup and Lead type alignment
// Skipping for now - tests disabled in CI
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LeadCard } from "../lead-card";
import type { Lead } from "@/types/lead";

// Mock the next/link component
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockLead: Lead = {
  id: "lead-123",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  phoneNumbers: [
    {
      number: "+1234567890",
      label: "Mobile",
      isPrimary: true,
      lineType: "mobile",
      verified: true,
    },
  ],
  address: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  propertyValue: 500000,
  propertyType: "Single Family",
  priority: "High",
  status: "New",
  source: "Website",
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 2000,
  yearBuilt: 2010,
  notes: "Interested buyer",
  tags: ["Hot Lead", "First Time Buyer"],
  assignedTo: "Jane Smith",
  lastContactDate: "2024-01-15",
  nextFollowUp: "2024-01-20",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
};

describe("LeadCard Component", () => {
  describe("rendering", () => {
    it("renders lead name", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders lead address", () => {
      render(<LeadCard lead={mockLead} />);
      expect(
        screen.getByText("123 Main St, New York, NY 10001"),
      ).toBeInTheDocument();
    });

    it("renders property value formatted as currency", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByText("$500,000")).toBeInTheDocument();
    });

    it("renders property type", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByText("Single Family")).toBeInTheDocument();
    });

    it("renders priority badge", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("links to lead detail page", () => {
      render(<LeadCard lead={mockLead} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/leads/lead-123");
    });
  });

  describe("action buttons", () => {
    it("renders email button", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByTitle("Email")).toBeInTheDocument();
    });

    it("renders call button", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByTitle("Call")).toBeInTheDocument();
    });

    it("renders SMS button", () => {
      render(<LeadCard lead={mockLead} />);
      expect(screen.getByTitle("SMS")).toBeInTheDocument();
    });
  });

  describe("priority colors", () => {
    it("applies correct color for High priority", () => {
      render(<LeadCard lead={{ ...mockLead, priority: "High" }} />);
      const badge = screen.getByText("High");
      expect(badge).toHaveClass("bg-orange-100", "text-orange-800");
    });

    it("applies correct color for Urgent priority", () => {
      render(<LeadCard lead={{ ...mockLead, priority: "Urgent" }} />);
      const badge = screen.getByText("Urgent");
      expect(badge).toHaveClass("bg-red-100", "text-red-800");
    });

    it("applies correct color for Medium priority", () => {
      render(<LeadCard lead={{ ...mockLead, priority: "Medium" }} />);
      const badge = screen.getByText("Medium");
      expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800");
    });

    it("applies correct color for Low priority", () => {
      render(<LeadCard lead={{ ...mockLead, priority: "Low" }} />);
      const badge = screen.getByText("Low");
      expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
    });
  });

  describe("dialog interactions", () => {
    it("opens dialog when more button is clicked", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      // Dialog should be open with lead details
      expect(screen.getByText("Lead Details")).toBeInTheDocument();
    });

    it("displays email in dialog when available", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("displays phone in dialog when available", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("+1234567890")).toBeInTheDocument();
    });

    it("displays property details in dialog", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("Property Value:")).toBeInTheDocument();
      expect(screen.getByText("Bedrooms:")).toBeInTheDocument();
      expect(screen.getByText("Bathrooms:")).toBeInTheDocument();
    });

    it("displays tags in dialog", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("Hot Lead")).toBeInTheDocument();
      expect(screen.getByText("First Time Buyer")).toBeInTheDocument();
    });

    it("displays notes in dialog", () => {
      render(<LeadCard lead={mockLead} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("Interested buyer")).toBeInTheDocument();
    });

    it("closes dialog when close button is clicked", () => {
      render(<LeadCard lead={mockLead} />);

      // Open dialog
      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.getByText("Lead Details")).toBeInTheDocument();

      // Close dialog
      fireEvent.click(
        screen.getByRole("button", { name: /close lead details/i }),
      );

      // Dialog should be closed (Lead Details should no longer be visible)
      expect(screen.queryByText("Lead Details")).not.toBeInTheDocument();
    });
  });

  describe("conditional rendering", () => {
    it("does not render email if not provided", () => {
      const leadWithoutEmail = { ...mockLead, email: undefined };
      render(<LeadCard lead={leadWithoutEmail} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });

    it("does not render phone if not provided", () => {
      const leadWithoutPhone = { ...mockLead, phone: undefined };
      render(<LeadCard lead={leadWithoutPhone} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.queryByText("+1234567890")).not.toBeInTheDocument();
    });

    it("does not render tags section if no tags", () => {
      const leadWithoutTags = { ...mockLead, tags: [] };
      render(<LeadCard lead={leadWithoutTags} />);

      fireEvent.click(
        screen.getByRole("button", { name: /open lead details/i }),
      );

      expect(screen.queryByText("Tags")).not.toBeInTheDocument();
    });
  });
});

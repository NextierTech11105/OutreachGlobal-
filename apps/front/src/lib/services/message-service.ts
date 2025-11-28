import type { Message, MessageFilter } from "@/types/message";

// Sample data for demonstration
const sampleMessages: Message[] = [
  {
    id: "msg-001",
    type: "email",
    from: "John Smith",
    email: "john.smith@example.com",
    subject: "Re: Your Email About Sales Automation Suite",
    preview:
      "Thank you for reaching out. I'm interested in learning more about your product...",
    content:
      "Thank you for reaching out. I'm interested in learning more about your product. Could you provide more details about the pricing and features? I'm particularly interested in the automation capabilities and how they might integrate with our existing CRM system. Looking forward to your response.",
    date: "2025-04-16T10:23:00",
    status: "new",
    campaign: "Q2 Tech Outreach",
    priority: "medium",
  },
  {
    id: "msg-002",
    type: "email",
    from: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    subject: "Re: Lead Generation Pro Demo Request",
    preview:
      "I'd like to schedule a demo of your Lead Generation Pro product. Are you available...",
    content:
      "I'd like to schedule a demo of your Lead Generation Pro product. Are you available next Tuesday at 2 PM EST? Our team is evaluating several solutions, and we'd like to see how your product compares. Please let me know if that time works for you or suggest an alternative.",
    date: "2025-04-15T16:45:00",
    status: "replied",
    campaign: "Healthcare Professionals",
  },
  {
    id: "msg-003",
    type: "email",
    from: "Michael Brown",
    email: "michael.brown@example.com",
    subject: "Re: Email Campaign Manager Introduction",
    preview:
      "Please remove me from your email list. I'm not interested in your services at this time.",
    content:
      "Please remove me from your email list. I'm not interested in your services at this time. Thank you for your understanding.",
    date: "2025-04-15T09:12:00",
    status: "unsubscribed",
    campaign: "Financial Services",
  },
  {
    id: "msg-004",
    type: "sms",
    from: "Emily Davis",
    phone: "+15551234567",
    preview:
      "This looks interesting. Can you tell me more about the pricing options?",
    content:
      "This looks interesting. Can you tell me more about the pricing options for your Sales Automation Suite?",
    date: "2025-04-14T14:30:00",
    status: "new",
    campaign: "Retail Stores NYC",
  },
  {
    id: "msg-005",
    type: "sms",
    from: "David Wilson",
    phone: "+15559876543",
    preview:
      "I've forwarded your info to our procurement team. They'll be in touch if interested.",
    content:
      "I've forwarded your info to our procurement team. They'll be in touch if interested.",
    date: "2025-04-14T11:05:00",
    status: "replied",
    campaign: "Education Institutions",
  },
  {
    id: "msg-006",
    type: "voice",
    from: "Jennifer Lee",
    phone: "+15552223333",
    preview: "Voicemail received (1:45)",
    content:
      "This is Jennifer from Acme Corp. I received your message about the sales automation tools. Please call me back at your convenience to discuss further.",
    date: "2025-04-13T15:20:00",
    status: "new",
    campaign: "Technology Companies",
    voiceTranscript:
      "This is Jennifer from Acme Corp. I received your message about the sales automation tools. Please call me back at your convenience to discuss further.",
    voiceRecording: "/recordings/voice-msg-006.mp3",
    callDuration: 105,
    callStatus: "completed",
  },
  {
    id: "msg-007",
    type: "voice",
    from: "Robert Taylor",
    phone: "+15554445555",
    preview: "Missed call (0:08)",
    content: "Missed call from Robert Taylor",
    date: "2025-04-13T10:15:00",
    status: "new",
    campaign: "Financial Services",
    callDuration: 8,
    callStatus: "missed",
  },
];

/**
 * Fetch messages based on filters
 */
export async function fetchMessages(
  filter?: MessageFilter,
): Promise<Message[]> {
  // In a real app, this would call an API to fetch messages
  // For demonstration, we'll filter the sample data

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let filteredMessages = [...sampleMessages];

  if (filter) {
    // Filter by search term
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredMessages = filteredMessages.filter(
        (message) =>
          message.from.toLowerCase().includes(searchLower) ||
          (message.email &&
            message.email.toLowerCase().includes(searchLower)) ||
          (message.phone &&
            message.phone.toLowerCase().includes(searchLower)) ||
          (message.subject &&
            message.subject.toLowerCase().includes(searchLower)) ||
          message.content.toLowerCase().includes(searchLower),
      );
    }

    // Filter by message type
    if (filter.type) {
      filteredMessages = filteredMessages.filter(
        (message) => message.type === filter.type,
      );
    }

    // Filter by status
    if (filter.status && filter.status.length > 0) {
      filteredMessages = filteredMessages.filter((message) =>
        filter.status?.includes(message.status),
      );
    }

    // Filter by date range
    if (filter.dateRange) {
      if (filter.dateRange.from) {
        filteredMessages = filteredMessages.filter(
          (message) => new Date(message.date) >= filter.dateRange!.from!,
        );
      }
      if (filter.dateRange.to) {
        filteredMessages = filteredMessages.filter(
          (message) => new Date(message.date) <= filter.dateRange!.to!,
        );
      }
    }

    // Filter by campaign
    if (filter.campaigns && filter.campaigns.length > 0) {
      filteredMessages = filteredMessages.filter(
        (message) =>
          message.campaign && filter.campaigns?.includes(message.campaign),
      );
    }

    // Filter by assigned user
    if (filter.assignedTo && filter.assignedTo.length > 0) {
      filteredMessages = filteredMessages.filter(
        (message) =>
          message.assignedTo && filter.assignedTo?.includes(message.assignedTo),
      );
    }
  }

  // Sort by date (newest first)
  filteredMessages.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return filteredMessages;
}

/**
 * Send a reply to a message
 */
export async function sendReply(
  messageId: string,
  replyText: string,
  replyType: string,
): Promise<boolean> {
  // In a real app, this would call an API to send the reply
  console.log(
    `Sending ${replyType} reply to message ${messageId}: ${replyText}`,
  );

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate success
  return true;
}

/**
 * Mark a message as read
 */
export async function markAsRead(messageId: string): Promise<boolean> {
  // In a real app, this would call an API to update the message status
  console.log(`Marking message ${messageId} as read`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate success
  return true;
}

/**
 * Archive a message
 */
export async function archiveMessage(messageId: string): Promise<boolean> {
  // In a real app, this would call an API to archive the message
  console.log(`Archiving message ${messageId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulate success
  return true;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  // In a real app, this would call an API to delete the message
  console.log(`Deleting message ${messageId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulate success
  return true;
}

/**
 * Flag a message
 */
export async function flagMessage(
  messageId: string,
  flagged: boolean,
): Promise<boolean> {
  // In a real app, this would call an API to flag/unflag the message
  console.log(`${flagged ? "Flagging" : "Unflagging"} message ${messageId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate success
  return true;
}

/**
 * Assign a message to a user
 */
export async function assignMessage(
  messageId: string,
  userId: string,
): Promise<boolean> {
  // In a real app, this would call an API to assign the message
  console.log(`Assigning message ${messageId} to user ${userId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Simulate success
  return true;
}

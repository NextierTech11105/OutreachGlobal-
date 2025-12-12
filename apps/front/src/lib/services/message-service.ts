import type { Message, MessageFilter } from "@/types/message";

/**
 * Fetch messages from SignalHouse API
 */
export async function fetchMessages(
  filter?: MessageFilter,
): Promise<Message[]> {
  try {
    // Build query params
    const params = new URLSearchParams();
    if (filter?.type) params.set("type", filter.type);

    // Fetch from real API
    const response = await fetch(`/api/inbox/messages?${params.toString()}`);
    const data = await response.json();

    if (data.error && !data.messages) {
      console.error("Message fetch error:", data.error);
      return [];
    }

    let filteredMessages: Message[] = data.messages || [];

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
            message.assignedTo &&
            filter.assignedTo?.includes(message.assignedTo),
        );
      }
    }

    // Sort by date (newest first)
    filteredMessages.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return filteredMessages;
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
}

/**
 * Send a reply to a message via SignalHouse
 */
export async function sendReply(
  messageId: string,
  replyText: string,
  replyType: string,
  options?: {
    to?: string;
    scheduleAt?: string;
  },
): Promise<boolean> {
  try {
    if (replyType === "sms" && options?.to) {
      const response = await fetch("/api/inbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: options.to,
          message: replyText,
          scheduleAt: options.scheduleAt,
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("Send reply error:", data.error);
        return false;
      }
      return true;
    }

    // For other types, log and return true for now
    console.log(
      `Sending ${replyType} reply to message ${messageId}: ${replyText}`,
    );
    return true;
  } catch (error) {
    console.error("Failed to send reply:", error);
    return false;
  }
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

export type MessageType = "email" | "sms" | "voice";
export type MessageStatus =
  | "new"
  | "read"
  | "replied"
  | "unsubscribed"
  | "flagged"
  | "archived"
  | "spam";
export type MessagePriority = "low" | "medium" | "high" | "urgent";

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  fromName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  preview: string;
  content: string;
  date: string;
  status: MessageStatus;
  campaign?: string;
  assignedTo?: string;
  priority?: MessagePriority;
  labels?: string[];
  attachments?: Attachment[];
  thread?: string;
  metadata?: Record<string, any>;
  voiceTranscript?: string;
  voiceRecording?: string;
  callDuration?: number;
  callStatus?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface MessageFilter {
  search?: string;
  type?: MessageType;
  status?: MessageStatus[];
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  campaigns?: string[];
  assignedTo?: string[];
  priority?: MessagePriority[];
  labels?: string[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: MessageType;
  subject?: string;
  body?: string;
  voiceScript?: string;
  smsText?: string;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  conditions: {
    type?: MessageType[];
    contains?: string[];
    from?: string[];
    campaign?: string[];
  };
  templateId: string;
  active: boolean;
  priority: number;
}

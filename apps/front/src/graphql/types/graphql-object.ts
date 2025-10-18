export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type AiSdrAvatar = {
  __typename?: 'AiSdrAvatar';
  active: Scalars['Boolean']['output'];
  avatarUri?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  faqs: Array<AiSdrFaq>;
  goal: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  industry: Scalars['String']['output'];
  mission: Scalars['String']['output'];
  name: Scalars['String']['output'];
  personality: Scalars['String']['output'];
  roles: Array<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  voiceType: Scalars['String']['output'];
};

export type AiSdrAvatarConnection = {
  __typename?: 'AiSdrAvatarConnection';
  edges: Array<AiSdrAvatarEdge>;
  pageInfo: PageInfo;
};

export type AiSdrAvatarEdge = {
  __typename?: 'AiSdrAvatarEdge';
  cursor: Scalars['String']['output'];
  node: AiSdrAvatar;
};

export type AiSdrFaq = {
  __typename?: 'AiSdrFaq';
  answer: Scalars['String']['output'];
  question: Scalars['String']['output'];
};

export type AiSdrFaqInput = {
  answer: Scalars['String']['input'];
  question: Scalars['String']['input'];
};

export type BulkDeleteLeadPayload = {
  __typename?: 'BulkDeleteLeadPayload';
  deletedLeadsCount: Scalars['Float']['output'];
};

export type BulkDeletePromptPayload = {
  __typename?: 'BulkDeletePromptPayload';
  deletedPromptsCount: Scalars['Float']['output'];
};

export type BusinessListSettings = {
  __typename?: 'BusinessListSettings';
  businessListApiToken?: Maybe<Scalars['String']['output']>;
  teamId: Scalars['ID']['output'];
};

export type BusinessListSettingsInput = {
  businessListApiToken?: InputMaybe<Scalars['String']['input']>;
};

export type CallCenterReport = {
  __typename?: 'CallCenterReport';
  aiSdrCalls: Scalars['Int']['output'];
  averageCallDuration: Scalars['Int']['output'];
  successRate: Scalars['Float']['output'];
  teamId: Scalars['ID']['output'];
  totalCalls: Scalars['Int']['output'];
};

export type CallHistory = {
  __typename?: 'CallHistory';
  contact: DialerContact;
  createdAt: Scalars['DateTime']['output'];
  dialerMode: DialerMode;
  disposition?: Maybe<Scalars['String']['output']>;
  duration: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  sid?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CallHistoryConnection = {
  __typename?: 'CallHistoryConnection';
  edges: Array<CallHistoryEdge>;
  pageInfo: PageInfo;
};

export type CallHistoryEdge = {
  __typename?: 'CallHistoryEdge';
  cursor: Scalars['String']['output'];
  node: CallHistory;
};

export type Campaign = {
  __typename?: 'Campaign';
  aiSdrAvatar?: Maybe<AiSdrAvatar>;
  campaignLeads: CampaignLeadConnection;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endsAt?: Maybe<Scalars['DateTime']['output']>;
  estimatedLeadsCount: Scalars['Int']['output'];
  executions: CampaignExecutionConnection;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['JSON']['output']>;
  maxScore: Scalars['Float']['output'];
  minScore: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  pausedAt?: Maybe<Scalars['DateTime']['output']>;
  resumedAt?: Maybe<Scalars['DateTime']['output']>;
  sequences: Array<CampaignSequence>;
  startsAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  targetMethod: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type CampaignCampaignLeadsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CampaignExecutionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type CampaignConnection = {
  __typename?: 'CampaignConnection';
  edges: Array<CampaignEdge>;
  pageInfo: PageInfo;
};

export type CampaignEdge = {
  __typename?: 'CampaignEdge';
  cursor: Scalars['String']['output'];
  node: Campaign;
};

export type CampaignExecution = {
  __typename?: 'CampaignExecution';
  createdAt: Scalars['DateTime']['output'];
  failedReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CampaignExecutionConnection = {
  __typename?: 'CampaignExecutionConnection';
  edges: Array<CampaignExecutionEdge>;
  pageInfo: PageInfo;
};

export type CampaignExecutionEdge = {
  __typename?: 'CampaignExecutionEdge';
  cursor: Scalars['String']['output'];
  node: CampaignExecution;
};

export type CampaignLead = {
  __typename?: 'CampaignLead';
  createdAt: Scalars['DateTime']['output'];
  currentSequenceStatus: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastSequenceExecutedAt?: Maybe<Scalars['DateTime']['output']>;
  lead: Lead;
  leadId: Scalars['ID']['output'];
  nextSequenceRunAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CampaignLeadConnection = {
  __typename?: 'CampaignLeadConnection';
  edges: Array<CampaignLeadEdge>;
  pageInfo: PageInfo;
};

export type CampaignLeadEdge = {
  __typename?: 'CampaignLeadEdge';
  cursor: Scalars['String']['output'];
  node: CampaignLead;
};

export type CampaignSequence = {
  __typename?: 'CampaignSequence';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  delayDays: Scalars['Float']['output'];
  delayHours: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  position: Scalars['Float']['output'];
  subject?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  voiceType?: Maybe<Scalars['String']['output']>;
};

export type CampaignSequenceEdge = {
  __typename?: 'CampaignSequenceEdge';
  cursor: Scalars['String']['output'];
  node: CampaignSequence;
};

export type CampaignSequenceInput = {
  content: Scalars['String']['input'];
  delayDays: Scalars['Float']['input'];
  delayHours: Scalars['Float']['input'];
  id?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  position: Scalars['Int']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
  voiceType?: InputMaybe<Scalars['String']['input']>;
};

export type ConnectIntegrationPayload = {
  __typename?: 'ConnectIntegrationPayload';
  method: Scalars['String']['output'];
  uri: Scalars['String']['output'];
};

export type CreateAiSdrAvatarInput = {
  active?: Scalars['Boolean']['input'];
  avatarUri?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  faqs: Array<AiSdrFaqInput>;
  goal: Scalars['String']['input'];
  industry: Scalars['String']['input'];
  mission: Scalars['String']['input'];
  name: Scalars['String']['input'];
  personality: Scalars['String']['input'];
  roles: Array<Scalars['String']['input']>;
  tags: Array<Scalars['String']['input']>;
  voiceType: Scalars['String']['input'];
};

export type CreateAiSdrAvatarPayload = {
  __typename?: 'CreateAiSdrAvatarPayload';
  avatar: AiSdrAvatar;
};

export type CreateCallHistoryInput = {
  aiSdrAvatarId?: InputMaybe<Scalars['ID']['input']>;
  dialerMode: DialerMode;
  disposition?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  sid?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCallHistoryPayload = {
  __typename?: 'CreateCallHistoryPayload';
  callHistory: CallHistory;
};

export type CreateCampaignInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  maxScore: Scalars['Int']['input'];
  minScore: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  sdrId: Scalars['ID']['input'];
  sequences: Array<CampaignSequenceInput>;
};

export type CreateCampaignPayload = {
  __typename?: 'CreateCampaignPayload';
  campaign: Campaign;
};

export type CreateImportLeadPresetPayload = {
  __typename?: 'CreateImportLeadPresetPayload';
  preset: ImportLeadPreset;
};

export type CreateLeadInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  score?: Scalars['Int']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  zipCode?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLeadPayload = {
  __typename?: 'CreateLeadPayload';
  lead: Lead;
};

export type CreateLeadPhoneNumberInput = {
  label: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};

export type CreateMessageInput = {
  body: Scalars['String']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
  toAddress: Scalars['String']['input'];
  toName?: InputMaybe<Scalars['String']['input']>;
};

export type CreateMessagePayload = {
  __typename?: 'CreateMessagePayload';
  message: Message;
};

export type CreateMessageTemplateInput = {
  data: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
};

export type CreateMessageTemplatePayload = {
  __typename?: 'CreateMessageTemplatePayload';
  messageTemplate: MessageTemplate;
};

export type CreatePowerDialerInput = {
  title: Scalars['String']['input'];
};

export type CreatePowerDialerPayload = {
  __typename?: 'CreatePowerDialerPayload';
  powerDialer: PowerDialer;
};

export type CreatePromptInput = {
  category: Scalars['String']['input'];
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  tags?: Array<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type CreatePromptPayload = {
  __typename?: 'CreatePromptPayload';
  prompt: Prompt;
};

export type CreateTeamAccountInput = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type CreateTeamAccountPayload = {
  __typename?: 'CreateTeamAccountPayload';
  team: Team;
  token: Scalars['String']['output'];
};

export type CreateWorkflowInput = {
  actions: Array<WorkflowActionInput>;
  active: Scalars['Boolean']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  priority: Scalars['Float']['input'];
  trigger: Scalars['String']['input'];
};

export type CreateWorkflowPayload = {
  __typename?: 'CreateWorkflowPayload';
  workflow: Workflow;
};

export type DeleteAiSdrAvatarPayload = {
  __typename?: 'DeleteAiSdrAvatarPayload';
  id: Scalars['String']['output'];
};

export type DeleteCampaignPayload = {
  __typename?: 'DeleteCampaignPayload';
  deletedCampaignId: Scalars['ID']['output'];
};

export type DeleteLeadPayload = {
  __typename?: 'DeleteLeadPayload';
  deletedLeadId: Scalars['String']['output'];
};

export type DeleteLeadPhoneNumberPayload = {
  __typename?: 'DeleteLeadPhoneNumberPayload';
  deletedLeadPhoneNumberId: Scalars['String']['output'];
};

export type DeleteMessageTemplatePayload = {
  __typename?: 'DeleteMessageTemplatePayload';
  deletedMessageTemplateId: Scalars['ID']['output'];
};

export type DeletePromptPayload = {
  __typename?: 'DeletePromptPayload';
  deletedPromptId: Scalars['String']['output'];
};

export type DeleteTwilioPhonePayload = {
  __typename?: 'DeleteTwilioPhonePayload';
  deletedSid: Scalars['String']['output'];
};

export type DialerContact = {
  __typename?: 'DialerContact';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lead: Lead;
  position: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DialerContactConnection = {
  __typename?: 'DialerContactConnection';
  edges: Array<DialerContactEdge>;
  pageInfo: PageInfo;
};

export type DialerContactEdge = {
  __typename?: 'DialerContactEdge';
  cursor: Scalars['String']['output'];
  node: DialerContact;
};

export enum DialerMode {
  AI_SDR = 'AI_SDR',
  MANUAL = 'MANUAL'
}

export type Facet = {
  __typename?: 'Facet';
  count: Scalars['Float']['output'];
  value: Scalars['String']['output'];
};

export type FacetResults = {
  __typename?: 'FacetResults';
  hits: Array<Facet>;
};

export type GenerateMessageTemplatePayload = {
  __typename?: 'GenerateMessageTemplatePayload';
  content: Scalars['String']['output'];
};

export type ImportBusinessListInput = {
  company_domain?: InputMaybe<Array<Scalars['String']['input']>>;
  company_name?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Array<Scalars['String']['input']>>;
  searchQuery: Scalars['String']['input'];
  state?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ImportLeadPreset = {
  __typename?: 'ImportLeadPreset';
  config?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ImportLeadPresetInput = {
  config: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
};

export type Integration = {
  __typename?: 'Integration';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isExpired: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  settings?: Maybe<Scalars['JSON']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IntegrationField = {
  __typename?: 'IntegrationField';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  moduleName: Scalars['String']['output'];
  sourceField: Scalars['String']['output'];
  /** the sub field of target field if field is a lookup or non primitive value */
  subField?: Maybe<Scalars['String']['output']>;
  targetField: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IntegrationFieldInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  sourceField: Scalars['String']['input'];
  subField?: InputMaybe<Scalars['String']['input']>;
  targetField: Scalars['String']['input'];
};

export type IntegrationTask = {
  __typename?: 'IntegrationTask';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  moduleName: Scalars['String']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IntegrationTaskConnection = {
  __typename?: 'IntegrationTaskConnection';
  edges: Array<IntegrationTaskEdge>;
  pageInfo: PageInfo;
};

export type IntegrationTaskEdge = {
  __typename?: 'IntegrationTaskEdge';
  cursor: Scalars['String']['output'];
  node: IntegrationTask;
};

export type InviteTeamMemberInput = {
  email: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type InviteTeamPayload = {
  __typename?: 'InviteTeamPayload';
  teamInvitation: TeamInvitation;
};

export type Lead = {
  __typename?: 'Lead';
  address?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  phoneNumbers: Array<LeadPhoneNumber>;
  position: Scalars['Int']['output'];
  property?: Maybe<Property>;
  score: Scalars['Int']['output'];
  source?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  zipCode?: Maybe<Scalars['String']['output']>;
};

export type LeadConnection = {
  __typename?: 'LeadConnection';
  edges: Array<LeadEdge>;
  pageInfo: PageInfo;
};

export type LeadEdge = {
  __typename?: 'LeadEdge';
  cursor: Scalars['String']['output'];
  node: Lead;
};

export type LeadPhoneNumber = {
  __typename?: 'LeadPhoneNumber';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type LeadPhoneNumberPayload = {
  __typename?: 'LeadPhoneNumberPayload';
  leadPhoneNumber: LeadPhoneNumber;
};

export type LeadStatus = {
  __typename?: 'LeadStatus';
  id: Scalars['ID']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LoginPayload = {
  __typename?: 'LoginPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type Message = {
  __typename?: 'Message';
  body?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  direction: Scalars['String']['output'];
  fromAddress?: Maybe<Scalars['String']['output']>;
  fromName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  subject?: Maybe<Scalars['String']['output']>;
  toAddress?: Maybe<Scalars['String']['output']>;
  toName?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  edges: Array<MessageEdge>;
  pageInfo: PageInfo;
};

export type MessageEdge = {
  __typename?: 'MessageEdge';
  cursor: Scalars['String']['output'];
  node: Message;
};

export type MessageTemplate = {
  __typename?: 'MessageTemplate';
  createdAt: Scalars['DateTime']['output'];
  data: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: MessageTemplateType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type MessageTemplateConnection = {
  __typename?: 'MessageTemplateConnection';
  edges: Array<MessageTemplateEdge>;
  pageInfo: PageInfo;
};

export type MessageTemplateEdge = {
  __typename?: 'MessageTemplateEdge';
  cursor: Scalars['String']['output'];
  node: MessageTemplate;
};

export enum MessageTemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  VOICE = 'VOICE'
}

export type ModuleMetadata = {
  __typename?: 'ModuleMetadata';
  fields: Scalars['JSON']['output'];
  name: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  bulkDeleteLead: BulkDeleteLeadPayload;
  bulkDeletePrompt: BulkDeletePromptPayload;
  connectIntegration: ConnectIntegrationPayload;
  createAiSdrAvatar: CreateAiSdrAvatarPayload;
  createCallHistory: CreateCallHistoryPayload;
  createCampaign: CreateCampaignPayload;
  createImportLeadPreset: CreateImportLeadPresetPayload;
  createLead: CreateLeadPayload;
  createLeadPhoneNumber: LeadPhoneNumberPayload;
  createMessage: CreateMessagePayload;
  createMessageTemplate: CreateMessageTemplatePayload;
  createPowerDialer: CreatePowerDialerPayload;
  createPrompt: CreatePromptPayload;
  createTeamAccount: CreateTeamAccountPayload;
  createWorkflow: CreateWorkflowPayload;
  deleteAiSdrAvatar: DeleteAiSdrAvatarPayload;
  deleteCampaign: DeleteCampaignPayload;
  deleteLead: DeleteLeadPayload;
  deleteLeadPhoneNumber: DeleteLeadPhoneNumberPayload;
  deleteMessageTemplate: DeleteMessageTemplatePayload;
  deletePrompt: DeletePromptPayload;
  deleteTwilioPhone: DeleteTwilioPhonePayload;
  generateMessageTemplate: GenerateMessageTemplatePayload;
  importLeadFromBusinessList: Scalars['Boolean']['output'];
  inviteTeamMember: InviteTeamPayload;
  login: LoginPayload;
  purchaseTwilioPhone: PurchaseTwilioPhonePayload;
  removeTeamInvitation: RemoveTeamInvitationPayload;
  removeTeamMember: Scalars['Boolean']['output'];
  resendTeamInvitation: ResendTeamInvitationPayload;
  syncIntegrationLead: SyncIntegrationLeadPayload;
  testSendgridSendEmail: Scalars['Boolean']['output'];
  testTwilioSendSms: Scalars['Boolean']['output'];
  toggleCampaignStatus: ToggleCampaignStatusPayload;
  updateAiSdrAvatar: UpdateAiSdrAvatarPayload;
  updateCampaign: UpdateCampaignPayload;
  updateLead: UpdateLeadPayload;
  updateLeadPhoneNumber: LeadPhoneNumberPayload;
  updateLeadPosition: UpdateLeadPositionPayload;
  updateMessageTemplate: UpdateMessageTemplatePayload;
  updateProfile: UpdateProfilePayload;
  updatePrompt: UpdatePromptPayload;
  updateSendgridSettings: UpdateSendgridSettingsPayload;
  updateTwilioSettings: UpdateTwilioSettingsPayload;
  upsertBusinessListSettings: UpsertBusinessListSettingsPayload;
  upsertDialerContact: UpsertDialerContactsPayload;
  upsertIntegrationFields: UpsertIntegrationFieldPayload;
};


export type MutationBulkDeleteLeadArgs = {
  leadIds: Array<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
};


export type MutationBulkDeletePromptArgs = {
  promptIds: Array<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
};


export type MutationConnectIntegrationArgs = {
  provider: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationCreateAiSdrAvatarArgs = {
  input: CreateAiSdrAvatarInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreateCallHistoryArgs = {
  dialerContactId: Scalars['ID']['input'];
  input: CreateCallHistoryInput;
  markAsCompleted?: Scalars['Boolean']['input'];
  powerDialerId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationCreateCampaignArgs = {
  input: CreateCampaignInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreateImportLeadPresetArgs = {
  input: ImportLeadPresetInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreateLeadArgs = {
  input: CreateLeadInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreateLeadPhoneNumberArgs = {
  input: CreateLeadPhoneNumberInput;
  leadId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationCreateMessageArgs = {
  input: CreateMessageInput;
  leadId?: InputMaybe<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
  type: Scalars['String']['input'];
};


export type MutationCreateMessageTemplateArgs = {
  input: CreateMessageTemplateInput;
  teamId: Scalars['ID']['input'];
  type: MessageTemplateType;
};


export type MutationCreatePowerDialerArgs = {
  input: CreatePowerDialerInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreatePromptArgs = {
  input: CreatePromptInput;
  teamId: Scalars['ID']['input'];
};


export type MutationCreateTeamAccountArgs = {
  code: Scalars['String']['input'];
  input: CreateTeamAccountInput;
};


export type MutationCreateWorkflowArgs = {
  input: CreateWorkflowInput;
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteAiSdrAvatarArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteCampaignArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteLeadArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteLeadPhoneNumberArgs = {
  leadId: Scalars['ID']['input'];
  leadPhoneNumberId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteMessageTemplateArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeletePromptArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationDeleteTwilioPhoneArgs = {
  sid: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationGenerateMessageTemplateArgs = {
  prompt: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationImportLeadFromBusinessListArgs = {
  input: ImportBusinessListInput;
  presetId?: InputMaybe<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
};


export type MutationInviteTeamMemberArgs = {
  input: InviteTeamMemberInput;
  teamId: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationPurchaseTwilioPhoneArgs = {
  areaCode: Scalars['String']['input'];
  friendlyName: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationRemoveTeamInvitationArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationRemoveTeamMemberArgs = {
  memberId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationResendTeamInvitationArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationSyncIntegrationLeadArgs = {
  id: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationTestSendgridSendEmailArgs = {
  email: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationTestTwilioSendSmsArgs = {
  teamId: Scalars['ID']['input'];
};


export type MutationToggleCampaignStatusArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateAiSdrAvatarArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAiSdrAvatarInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateCampaignArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCampaignInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateLeadArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLeadInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateLeadPhoneNumberArgs = {
  label: Scalars['String']['input'];
  leadId: Scalars['ID']['input'];
  leadPhoneNumberId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateLeadPositionArgs = {
  id: Scalars['ID']['input'];
  newPosition: Scalars['Int']['input'];
  oldPosition: Scalars['Int']['input'];
  status: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateMessageTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMessageTemplateInput;
  teamId: Scalars['ID']['input'];
  type: MessageTemplateType;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdatePromptArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePromptInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateSendgridSettingsArgs = {
  input: SendgridSettingsInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpdateTwilioSettingsArgs = {
  input: TwilioSettingsInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpsertBusinessListSettingsArgs = {
  input: BusinessListSettingsInput;
  teamId: Scalars['ID']['input'];
};


export type MutationUpsertDialerContactArgs = {
  leadIds: Array<Scalars['ID']['input']>;
  powerDialerId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type MutationUpsertIntegrationFieldsArgs = {
  fields: Array<IntegrationFieldInput>;
  integrationId: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPrevPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
  total: Scalars['Float']['output'];
  totalPerPage: Scalars['Float']['output'];
};

export type PowerDialer = {
  __typename?: 'PowerDialer';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  successRate: Scalars['Float']['output'];
  title: Scalars['String']['output'];
  totalDuration: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PowerDialerConnection = {
  __typename?: 'PowerDialerConnection';
  edges: Array<PowerDialerEdge>;
  pageInfo: PageInfo;
};

export type PowerDialerEdge = {
  __typename?: 'PowerDialerEdge';
  cursor: Scalars['String']['output'];
  node: PowerDialer;
};

export type Prompt = {
  __typename?: 'Prompt';
  category: Scalars['String']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PromptConnection = {
  __typename?: 'PromptConnection';
  edges: Array<PromptEdge>;
  pageInfo: PageInfo;
};

export type PromptEdge = {
  __typename?: 'PromptEdge';
  cursor: Scalars['String']['output'];
  node: Prompt;
};

export type Property = {
  __typename?: 'Property';
  address?: Maybe<Scalars['JSON']['output']>;
  assessedValue?: Maybe<Scalars['Int']['output']>;
  auctionDate?: Maybe<Scalars['DateTime']['output']>;
  buildingSquareFeet?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  estimatedValue?: Maybe<Scalars['Int']['output']>;
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lotSquareFeet?: Maybe<Scalars['Float']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  mortgageInfo?: Maybe<Scalars['JSON']['output']>;
  ownerFirstName?: Maybe<Scalars['String']['output']>;
  ownerLastName?: Maybe<Scalars['String']['output']>;
  ownerName?: Maybe<Scalars['String']['output']>;
  ownerOccupied: Scalars['Boolean']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
  type?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  useCode?: Maybe<Scalars['String']['output']>;
  yearBuilt?: Maybe<Scalars['Int']['output']>;
};

export type PropertyConnection = {
  __typename?: 'PropertyConnection';
  edges: Array<PropertyEdge>;
  pageInfo: PageInfo;
};

export type PropertyEdge = {
  __typename?: 'PropertyEdge';
  cursor: Scalars['String']['output'];
  node: Property;
};

export type PurchaseTwilioPhonePayload = {
  __typename?: 'PurchaseTwilioPhonePayload';
  phone: TwilioPhone;
};

export type Query = {
  __typename?: 'Query';
  aiSdrAvatar: AiSdrAvatar;
  aiSdrAvatars: AiSdrAvatarConnection;
  businessListSettings: BusinessListSettings;
  callCenterReport: CallCenterReport;
  callHistories: CallHistoryConnection;
  campaign: Campaign;
  campaigns: CampaignConnection;
  dialerContacts: DialerContactConnection;
  firstTeam?: Maybe<Team>;
  importLeadPresets: Array<ImportLeadPreset>;
  integration: Integration;
  integrationFields: Array<IntegrationField>;
  integrationTasks: IntegrationTaskConnection;
  lead: Lead;
  leadStatuses: Array<LeadStatus>;
  leadTags: Array<Scalars['String']['output']>;
  leads: LeadConnection;
  leadsCount: Scalars['Int']['output'];
  me: User;
  messageTemplate: MessageTemplate;
  messageTemplates: MessageTemplateConnection;
  messages: MessageConnection;
  moduleMetadata: ModuleMetadata;
  powerDialer: PowerDialer;
  powerDialers: PowerDialerConnection;
  prompt: Prompt;
  prompts: PromptConnection;
  promptsCount: Scalars['Int']['output'];
  properties: PropertyConnection;
  resources: ResourceConnection;
  searchFacets: FacetResults;
  sendgridSettings: SendgridSettings;
  team: Team;
  teamInvitationByCode?: Maybe<TeamInvitation>;
  teamInvitations: TeamInvitationConnection;
  teamMembers: TeamMemberConnection;
  teamReport: TeamReport;
  twilioPhones: Array<TwilioPhone>;
  twilioSettings: TwilioSettings;
  workflows: WorkflowConnection;
};


export type QueryAiSdrAvatarArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryAiSdrAvatarsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryBusinessListSettingsArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryCallCenterReportArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryCallHistoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  powerDialerId?: InputMaybe<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryCampaignArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryCampaignsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryDialerContactsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  powerDialerId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryImportLeadPresetsArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryIntegrationArgs = {
  id: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryIntegrationFieldsArgs = {
  integrationId: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryIntegrationTasksArgs = {
  integrationId: Scalars['ID']['input'];
  moduleName?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryLeadArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryLeadStatusesArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryLeadTagsArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryLeadsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hasPhone?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  noStatus?: InputMaybe<Scalars['Boolean']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  teamId: Scalars['ID']['input'];
};


export type QueryLeadsCountArgs = {
  maxScore?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryMessageTemplateArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryMessageTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
  types?: InputMaybe<Array<MessageTemplateType>>;
};


export type QueryMessagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryModuleMetadataArgs = {
  name: Scalars['String']['input'];
  provider: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryPowerDialerArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryPowerDialersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryPromptArgs = {
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryPromptsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPromptsCountArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPropertiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryResourcesArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  type: Scalars['String']['input'];
};


export type QuerySearchFacetsArgs = {
  facetQuery?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QuerySendgridSettingsArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryTeamArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTeamInvitationByCodeArgs = {
  code: Scalars['String']['input'];
};


export type QueryTeamInvitationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryTeamMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};


export type QueryTeamReportArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryTwilioPhonesArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryTwilioSettingsArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryWorkflowsArgs = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['ID']['input'];
};

export type RemoveTeamInvitationPayload = {
  __typename?: 'RemoveTeamInvitationPayload';
  removedId: Scalars['ID']['output'];
};

export type ResendTeamInvitationPayload = {
  __typename?: 'ResendTeamInvitationPayload';
  teamInvitation: TeamInvitation;
};

export type Resource = {
  __typename?: 'Resource';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
};

export type ResourceConnection = {
  __typename?: 'ResourceConnection';
  edges: Array<ResourceEdge>;
  pageInfo: PageInfo;
};

export type ResourceEdge = {
  __typename?: 'ResourceEdge';
  cursor: Scalars['String']['output'];
  node: Resource;
};

export type SendgridSettings = {
  __typename?: 'SendgridSettings';
  sendgridApiKey?: Maybe<Scalars['String']['output']>;
  sendgridBatchSize?: Maybe<Scalars['Int']['output']>;
  sendgridDailyLimit?: Maybe<Scalars['Int']['output']>;
  sendgridDefaultFooter?: Maybe<Scalars['String']['output']>;
  sendgridEmailCategory?: Maybe<Scalars['String']['output']>;
  sendgridEnableClickTracking?: Maybe<Scalars['Boolean']['output']>;
  sendgridEnableOpenTracking?: Maybe<Scalars['Boolean']['output']>;
  sendgridEnableSubscriptionTracking?: Maybe<Scalars['Boolean']['output']>;
  sendgridEventTypes?: Maybe<Array<Scalars['String']['output']>>;
  sendgridFromEmail?: Maybe<Scalars['String']['output']>;
  sendgridFromName?: Maybe<Scalars['String']['output']>;
  sendgridIpPool?: Maybe<Scalars['String']['output']>;
  sendgridReplyToEmail?: Maybe<Scalars['String']['output']>;
  teamId: Scalars['ID']['output'];
};

export type SendgridSettingsInput = {
  sendgridApiKey?: InputMaybe<Scalars['String']['input']>;
  sendgridBatchSize?: InputMaybe<Scalars['Int']['input']>;
  sendgridDailyLimit?: InputMaybe<Scalars['Int']['input']>;
  sendgridDefaultFooter?: InputMaybe<Scalars['String']['input']>;
  sendgridEmailCategory?: InputMaybe<Scalars['String']['input']>;
  sendgridEnableClickTracking?: InputMaybe<Scalars['Boolean']['input']>;
  sendgridEnableOpenTracking?: InputMaybe<Scalars['Boolean']['input']>;
  sendgridEnableSubscriptionTracking?: InputMaybe<Scalars['Boolean']['input']>;
  sendgridEventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  sendgridFromEmail?: InputMaybe<Scalars['String']['input']>;
  sendgridFromName?: InputMaybe<Scalars['String']['input']>;
  sendgridIpPool?: InputMaybe<Scalars['String']['input']>;
  sendgridReplyToEmail?: InputMaybe<Scalars['String']['input']>;
};

export type SyncIntegrationLeadPayload = {
  __typename?: 'SyncIntegrationLeadPayload';
  task: IntegrationTask;
};

export type Team = {
  __typename?: 'Team';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TeamInvitation = {
  __typename?: 'TeamInvitation';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  invitedBy?: Maybe<User>;
  role: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TeamInvitationConnection = {
  __typename?: 'TeamInvitationConnection';
  edges: Array<TeamInvitationEdge>;
  pageInfo: PageInfo;
};

export type TeamInvitationEdge = {
  __typename?: 'TeamInvitationEdge';
  cursor: Scalars['String']['output'];
  node: TeamInvitation;
};

export type TeamMember = {
  __typename?: 'TeamMember';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type TeamMemberConnection = {
  __typename?: 'TeamMemberConnection';
  edges: Array<TeamMemberEdge>;
  pageInfo: PageInfo;
};

export type TeamMemberEdge = {
  __typename?: 'TeamMemberEdge';
  cursor: Scalars['String']['output'];
  node: TeamMember;
};

export type TeamReport = {
  __typename?: 'TeamReport';
  enrichedLeadsCount: Scalars['Int']['output'];
  highScoreLeadsCount: Scalars['Int']['output'];
  propertiesCount: Scalars['Int']['output'];
  verifiedLeadsCount: Scalars['Int']['output'];
};

export type ToggleCampaignStatusPayload = {
  __typename?: 'ToggleCampaignStatusPayload';
  campaign: Campaign;
};

export type TwilioPhone = {
  __typename?: 'TwilioPhone';
  capabilities: TwilioPhoneCapability;
  friendlyName: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  sid: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type TwilioPhoneCapability = {
  __typename?: 'TwilioPhoneCapability';
  mms: Scalars['Boolean']['output'];
  sms: Scalars['Boolean']['output'];
  voice: Scalars['Boolean']['output'];
};

export type TwilioSettings = {
  __typename?: 'TwilioSettings';
  teamId: Scalars['ID']['output'];
  twiMLAppSid?: Maybe<Scalars['String']['output']>;
  twilioAccountSid?: Maybe<Scalars['String']['output']>;
  twilioApiKey?: Maybe<Scalars['String']['output']>;
  twilioApiSecret?: Maybe<Scalars['String']['output']>;
  twilioAuthToken?: Maybe<Scalars['String']['output']>;
  twilioCallTimeout?: Maybe<Scalars['Int']['output']>;
  twilioDefaultPhoneNumber?: Maybe<Scalars['String']['output']>;
  twilioDefaultVoiceMessage?: Maybe<Scalars['String']['output']>;
  twilioEnableRecordCalls?: Maybe<Scalars['Boolean']['output']>;
  twilioEnableSms?: Maybe<Scalars['Boolean']['output']>;
  twilioEnableVoiceCalls?: Maybe<Scalars['Boolean']['output']>;
  twilioTranscribeVoicemail?: Maybe<Scalars['Boolean']['output']>;
};

export type TwilioSettingsInput = {
  twiMLAppSid?: InputMaybe<Scalars['String']['input']>;
  twilioAccountSid?: InputMaybe<Scalars['String']['input']>;
  twilioApiKey?: InputMaybe<Scalars['String']['input']>;
  twilioApiSecret?: InputMaybe<Scalars['String']['input']>;
  twilioAuthToken?: InputMaybe<Scalars['String']['input']>;
  twilioCallTimeout?: InputMaybe<Scalars['Int']['input']>;
  twilioDefaultPhoneNumber?: InputMaybe<Scalars['String']['input']>;
  twilioDefaultVoiceMessage?: InputMaybe<Scalars['String']['input']>;
  twilioEnableRecordCalls?: InputMaybe<Scalars['Boolean']['input']>;
  twilioEnableSms?: InputMaybe<Scalars['Boolean']['input']>;
  twilioEnableVoiceCalls?: InputMaybe<Scalars['Boolean']['input']>;
  twilioTranscribeVoicemail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateAiSdrAvatarInput = {
  active?: Scalars['Boolean']['input'];
  avatarUri?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  faqs: Array<AiSdrFaqInput>;
  goal: Scalars['String']['input'];
  industry: Scalars['String']['input'];
  mission: Scalars['String']['input'];
  name: Scalars['String']['input'];
  personality: Scalars['String']['input'];
  roles: Array<Scalars['String']['input']>;
  tags: Array<Scalars['String']['input']>;
  voiceType: Scalars['String']['input'];
};

export type UpdateAiSdrAvatarPayload = {
  __typename?: 'UpdateAiSdrAvatarPayload';
  avatar: AiSdrAvatar;
};

export type UpdateCampaignInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  maxScore: Scalars['Int']['input'];
  minScore: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  sdrId: Scalars['ID']['input'];
  sequences: Array<CampaignSequenceInput>;
};

export type UpdateCampaignPayload = {
  __typename?: 'UpdateCampaignPayload';
  campaign: Campaign;
};

export type UpdateLeadInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  score?: Scalars['Int']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  zipCode?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLeadPayload = {
  __typename?: 'UpdateLeadPayload';
  lead: Lead;
};

export type UpdateLeadPositionPayload = {
  __typename?: 'UpdateLeadPositionPayload';
  lead: Lead;
};

export type UpdateMessageTemplateInput = {
  data: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
};

export type UpdateMessageTemplatePayload = {
  __typename?: 'UpdateMessageTemplatePayload';
  messageTemplate: MessageTemplate;
};

export type UpdateProfileInput = {
  name: Scalars['String']['input'];
};

export type UpdateProfilePayload = {
  __typename?: 'UpdateProfilePayload';
  user: User;
};

export type UpdatePromptInput = {
  category: Scalars['String']['input'];
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  tags?: Array<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type UpdatePromptPayload = {
  __typename?: 'UpdatePromptPayload';
  prompt: Prompt;
};

export type UpdateSendgridSettingsPayload = {
  __typename?: 'UpdateSendgridSettingsPayload';
  settings: SendgridSettings;
};

export type UpdateTwilioSettingsPayload = {
  __typename?: 'UpdateTwilioSettingsPayload';
  settings: TwilioSettings;
};

export type UpsertBusinessListSettingsPayload = {
  __typename?: 'UpsertBusinessListSettingsPayload';
  settings: BusinessListSettings;
};

export type UpsertDialerContactsPayload = {
  __typename?: 'UpsertDialerContactsPayload';
  newLeadsCount: Scalars['Float']['output'];
};

export type UpsertIntegrationFieldPayload = {
  __typename?: 'UpsertIntegrationFieldPayload';
  fields: Array<IntegrationField>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  emailVerifiedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  password: Scalars['String']['output'];
  role: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type Workflow = {
  __typename?: 'Workflow';
  active: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  trigger: WorkflowTask;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version: Scalars['String']['output'];
};

export type WorkflowActionInput = {
  name: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

export type WorkflowConnection = {
  __typename?: 'WorkflowConnection';
  edges: Array<WorkflowEdge>;
  pageInfo: PageInfo;
};

export type WorkflowEdge = {
  __typename?: 'WorkflowEdge';
  cursor: Scalars['String']['output'];
  node: Workflow;
};

export type WorkflowTask = {
  __typename?: 'WorkflowTask';
  categories: Array<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inputPort?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  objectTypes?: Maybe<Array<Scalars['String']['output']>>;
  outputPorts: Array<Scalars['String']['output']>;
  paths: Array<Scalars['String']['output']>;
  type: WorkflowTaskType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version: Scalars['String']['output'];
};

export type WorkflowTaskEdge = {
  __typename?: 'WorkflowTaskEdge';
  cursor: Scalars['String']['output'];
  node: WorkflowTask;
};

export enum WorkflowTaskType {
  ACTION = 'ACTION',
  CONDITION = 'CONDITION',
  TRIGGER = 'TRIGGER'
}

export type CreateCampaignMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreateCampaignInput;
}>;


export type CreateCampaignMutation = { __typename?: 'Mutation', createCampaign: { __typename?: 'CreateCampaignPayload', campaign: { __typename?: 'Campaign', id: string, name: string, description?: string | null } } };

export type UpdateCampaignMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  input: UpdateCampaignInput;
}>;


export type UpdateCampaignMutation = { __typename?: 'Mutation', updateCampaign: { __typename?: 'UpdateCampaignPayload', campaign: { __typename?: 'Campaign', id: string, name: string, status: string, estimatedLeadsCount: number, createdAt: any, updatedAt?: any | null, aiSdrAvatar?: { __typename?: 'AiSdrAvatar', id: string, name: string } | null } } };

export type DeleteCampaignMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type DeleteCampaignMutation = { __typename?: 'Mutation', deleteCampaign: { __typename?: 'DeleteCampaignPayload', deletedCampaignId: string } };

export type ToggleCampaignStatusMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type ToggleCampaignStatusMutation = { __typename?: 'Mutation', toggleCampaignStatus: { __typename?: 'ToggleCampaignStatusPayload', campaign: { __typename?: 'Campaign', id: string, status: string } } };

export type CampaignExecutionsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type CampaignExecutionsQuery = { __typename?: 'Query', campaign: { __typename?: 'Campaign', id: string, executions: { __typename?: 'CampaignExecutionConnection', edges: Array<{ __typename?: 'CampaignExecutionEdge', node: { __typename?: 'CampaignExecution', id: string, status: string, failedReason?: string | null, createdAt: any } }> } } };

export type CampaignLeadsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type CampaignLeadsQuery = { __typename?: 'Query', campaign: { __typename?: 'Campaign', id: string, campaignLeads: { __typename?: 'CampaignLeadConnection', edges: Array<{ __typename?: 'CampaignLeadEdge', node: { __typename?: 'CampaignLead', lastSequenceExecutedAt?: any | null, lead: { __typename?: 'Lead', id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, address?: string | null, score: number, createdAt: any, updatedAt?: any | null, tags: Array<string> } } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } } };

export type CampaignsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  searchQuery?: InputMaybe<Scalars['String']['input']>;
}>;


export type CampaignsQuery = { __typename?: 'Query', campaigns: { __typename?: 'CampaignConnection', edges: Array<{ __typename?: 'CampaignEdge', node: { __typename?: 'Campaign', id: string, name: string, status: string, estimatedLeadsCount: number, createdAt: any, updatedAt?: any | null, aiSdrAvatar?: { __typename?: 'AiSdrAvatar', id: string, name: string } | null } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } };

export type CampaignFormQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type CampaignFormQuery = { __typename?: 'Query', campaign: { __typename?: 'Campaign', id: string, name: string, description?: string | null, status: string, minScore: number, maxScore: number, aiSdrAvatar?: { __typename?: 'AiSdrAvatar', id: string, name: string } | null, sequences: Array<{ __typename?: 'CampaignSequence', id: string, name: string, type: string, content: string, position: number, subject?: string | null, voiceType?: string | null, delayDays: number, delayHours: number }> } };

export type CampaignDetailsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type CampaignDetailsQuery = { __typename?: 'Query', campaign: { __typename?: 'Campaign', id: string, estimatedLeadsCount: number, name: string, description?: string | null, status: string, minScore: number, maxScore: number, aiSdrAvatar?: { __typename?: 'AiSdrAvatar', id: string, name: string } | null, sequences: Array<{ __typename?: 'CampaignSequence', id: string, name: string, type: string, content: string, position: number, subject?: string | null, voiceType?: string | null, delayDays: number, delayHours: number }> } };

export type UpsertIntegrationFieldsMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  integrationId: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
  fields: Array<IntegrationFieldInput> | IntegrationFieldInput;
}>;


export type UpsertIntegrationFieldsMutation = { __typename?: 'Mutation', upsertIntegrationFields: { __typename?: 'UpsertIntegrationFieldPayload', fields: Array<{ __typename?: 'IntegrationField', id: string, sourceField: string, targetField: string }> } };

export type ConnectIntegrationMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  provider: Scalars['String']['input'];
}>;


export type ConnectIntegrationMutation = { __typename?: 'Mutation', connectIntegration: { __typename?: 'ConnectIntegrationPayload', uri: string } };

export type SyncIntegrationLeadMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
}>;


export type SyncIntegrationLeadMutation = { __typename?: 'Mutation', syncIntegrationLead: { __typename?: 'SyncIntegrationLeadPayload', task: { __typename?: 'IntegrationTask', id: string, status: string } } };

export type IntegrationFieldsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  integrationId: Scalars['ID']['input'];
  moduleName: Scalars['String']['input'];
}>;


export type IntegrationFieldsQuery = { __typename?: 'Query', integrationFields: Array<{ __typename?: 'IntegrationField', id: string, sourceField: string, targetField: string, subField?: string | null }> };

export type IntegrationTasksQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  integrationId: Scalars['ID']['input'];
  moduleName?: InputMaybe<Scalars['String']['input']>;
}>;


export type IntegrationTasksQuery = { __typename?: 'Query', integrationTasks: { __typename?: 'IntegrationTaskConnection', edges: Array<{ __typename?: 'IntegrationTaskEdge', node: { __typename?: 'IntegrationTask', id: string, moduleName: string, status: string, createdAt: any, updatedAt?: any | null } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } };

export type IntegrationDetailsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['String']['input'];
}>;


export type IntegrationDetailsQuery = { __typename?: 'Query', integration: { __typename?: 'Integration', id: string, name: string, enabled: boolean, isExpired: boolean } };

export type ModuleMetadataQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  provider: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type ModuleMetadataQuery = { __typename?: 'Query', moduleMetadata: { __typename?: 'ModuleMetadata', name: string, fields: any } };

export type SearchFacetsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  facetQuery?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
}>;


export type SearchFacetsQuery = { __typename?: 'Query', searchFacets: { __typename?: 'FacetResults', hits: Array<{ __typename?: 'Facet', value: string, count: number }> } };

export type LeadKanbanQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type LeadKanbanQuery = { __typename?: 'Query', leadStatuses: Array<{ __typename?: 'LeadStatus', id: string }>, leads: { __typename?: 'LeadConnection', edges: Array<{ __typename?: 'LeadEdge', node: { __typename?: 'Lead', id: string, status?: string | null, name?: string | null, phone?: string | null, email?: string | null, source?: string | null, notes?: string | null, tags: Array<string>, position: number, createdAt: any, updatedAt?: any | null, property?: { __typename?: 'Property', id: string, address?: any | null, type?: string | null, assessedValue?: number | null, estimatedValue?: number | null, buildingSquareFeet?: number | null, lotSquareFeet?: number | null, yearBuilt?: number | null, ownerOccupied: boolean, ownerFirstName?: string | null, ownerLastName?: string | null, useCode?: string | null } | null } }> } };

export type CreateImportLeadPresetMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: ImportLeadPresetInput;
}>;


export type CreateImportLeadPresetMutation = { __typename?: 'Mutation', createImportLeadPreset: { __typename?: 'CreateImportLeadPresetPayload', preset: { __typename?: 'ImportLeadPreset', id: string, name: string, config?: any | null } } };

export type CreateLeadMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreateLeadInput;
}>;


export type CreateLeadMutation = { __typename?: 'Mutation', createLead: { __typename?: 'CreateLeadPayload', lead: { __typename?: 'Lead', id: string } } };

export type UpdateLeadMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  input: UpdateLeadInput;
}>;


export type UpdateLeadMutation = { __typename?: 'Mutation', updateLead: { __typename?: 'UpdateLeadPayload', lead: { __typename?: 'Lead', id: string } } };

export type BulkDeleteLeadMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  leadIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteLeadMutation = { __typename?: 'Mutation', bulkDeleteLead: { __typename?: 'BulkDeleteLeadPayload', deletedLeadsCount: number } };

export type CreateLeadPhoneNumberMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  leadId: Scalars['ID']['input'];
  input: CreateLeadPhoneNumberInput;
}>;


export type CreateLeadPhoneNumberMutation = { __typename?: 'Mutation', createLeadPhoneNumber: { __typename?: 'LeadPhoneNumberPayload', leadPhoneNumber: { __typename?: 'LeadPhoneNumber', id: string } } };

export type UpdateLeadPhoneNumberMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  leadId: Scalars['ID']['input'];
  leadPhoneNumberId: Scalars['ID']['input'];
  label: Scalars['String']['input'];
}>;


export type UpdateLeadPhoneNumberMutation = { __typename?: 'Mutation', updateLeadPhoneNumber: { __typename?: 'LeadPhoneNumberPayload', leadPhoneNumber: { __typename?: 'LeadPhoneNumber', id: string } } };

export type DeleteLeadPhoneNumberMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  leadId: Scalars['ID']['input'];
  leadPhoneNumberId: Scalars['ID']['input'];
}>;


export type DeleteLeadPhoneNumberMutation = { __typename?: 'Mutation', deleteLeadPhoneNumber: { __typename?: 'DeleteLeadPhoneNumberPayload', deletedLeadPhoneNumberId: string } };

export type UpdateLeadPositionMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  newPosition: Scalars['Int']['input'];
  oldPosition: Scalars['Int']['input'];
  status: Scalars['String']['input'];
}>;


export type UpdateLeadPositionMutation = { __typename?: 'Mutation', updateLeadPosition: { __typename?: 'UpdateLeadPositionPayload', lead: { __typename?: 'Lead', id: string } } };

export type ImportLeadFromBusinessListMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: ImportBusinessListInput;
  presetId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ImportLeadFromBusinessListMutation = { __typename?: 'Mutation', importLeadFromBusinessList: boolean };

export type ImportLeadPresetsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type ImportLeadPresetsQuery = { __typename?: 'Query', importLeadPresets: Array<{ __typename?: 'ImportLeadPreset', id: string, name: string, config?: any | null }> };

export type LeadsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  hasPhone?: InputMaybe<Scalars['Boolean']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type LeadsQuery = { __typename?: 'Query', leads: { __typename?: 'LeadConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'LeadEdge', node: { __typename?: 'Lead', id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, address?: string | null, score: number, tags: Array<string>, company?: string | null, createdAt: any, updatedAt?: any | null } }> } };

export type LeadTagsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type LeadTagsQuery = { __typename?: 'Query', leadTags: Array<string> };

export type LeadStatusesQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type LeadStatusesQuery = { __typename?: 'Query', leadStatuses: Array<{ __typename?: 'LeadStatus', id: string }> };

export type LeadsCountQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  minScore?: InputMaybe<Scalars['Int']['input']>;
  maxScore?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LeadsCountQuery = { __typename?: 'Query', leadsCount: number };

export type LeadDetailsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type LeadDetailsQuery = { __typename?: 'Query', lead: { __typename?: 'Lead', id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, tags: Array<string>, source?: string | null, createdAt: any, phoneNumbers: Array<{ __typename?: 'LeadPhoneNumber', id: string, phone: string, label: string }>, property?: { __typename?: 'Property', id: string, address?: any | null, type?: string | null, assessedValue?: number | null, estimatedValue?: number | null, buildingSquareFeet?: number | null, lotSquareFeet?: number | null, yearBuilt?: number | null, ownerOccupied: boolean, ownerFirstName?: string | null, ownerLastName?: string | null, useCode?: string | null } | null } };

export type LeadFormQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type LeadFormQuery = { __typename?: 'Query', lead: { __typename?: 'Lead', id: string, firstName?: string | null, lastName?: string | null, email?: string | null, phone?: string | null, title?: string | null, company?: string | null, zipCode?: string | null, country?: string | null, state?: string | null, city?: string | null, address?: string | null, source?: string | null, notes?: string | null, status?: string | null, tags: Array<string>, score: number } };

export type CreateMessageTemplateMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreateMessageTemplateInput;
  type: MessageTemplateType;
}>;


export type CreateMessageTemplateMutation = { __typename?: 'Mutation', createMessageTemplate: { __typename?: 'CreateMessageTemplatePayload', messageTemplate: { __typename?: 'MessageTemplate', id: string, type: MessageTemplateType, name: string, data: any } } };

export type UpdateMessageTemplateMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  input: UpdateMessageTemplateInput;
  type: MessageTemplateType;
}>;


export type UpdateMessageTemplateMutation = { __typename?: 'Mutation', updateMessageTemplate: { __typename?: 'UpdateMessageTemplatePayload', messageTemplate: { __typename?: 'MessageTemplate', id: string, type: MessageTemplateType, name: string, data: any } } };

export type DeleteMessageTemplateMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type DeleteMessageTemplateMutation = { __typename?: 'Mutation', deleteMessageTemplate: { __typename?: 'DeleteMessageTemplatePayload', deletedMessageTemplateId: string } };

export type GenerateMessageTemplateMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
}>;


export type GenerateMessageTemplateMutation = { __typename?: 'Mutation', generateMessageTemplate: { __typename?: 'GenerateMessageTemplatePayload', content: string } };

export type MessageTemplatesQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  types?: InputMaybe<Array<MessageTemplateType> | MessageTemplateType>;
}>;


export type MessageTemplatesQuery = { __typename?: 'Query', messageTemplates: { __typename?: 'MessageTemplateConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'MessageTemplateEdge', cursor: string, node: { __typename?: 'MessageTemplate', id: string, type: MessageTemplateType, name: string, data: any, createdAt: any, updatedAt?: any | null } }> } };

export type CreateMessageMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  type: Scalars['String']['input'];
  input: CreateMessageInput;
  leadId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateMessageMutation = { __typename?: 'Mutation', createMessage: { __typename?: 'CreateMessagePayload', message: { __typename?: 'Message', id: string, body?: string | null, direction: string, type: string, createdAt: any, updatedAt?: any | null } } };

export type MessagesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  direction?: InputMaybe<Scalars['String']['input']>;
}>;


export type MessagesQuery = { __typename?: 'Query', messages: { __typename?: 'MessageConnection', edges: Array<{ __typename?: 'MessageEdge', node: { __typename?: 'Message', id: string, status: string, fromAddress?: string | null, fromName?: string | null, toAddress?: string | null, toName?: string | null, subject?: string | null, body?: string | null, direction: string, type: string, createdAt: any, updatedAt?: any | null } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } };

export type CreateCallHistoryMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  powerDialerId: Scalars['ID']['input'];
  dialerContactId: Scalars['ID']['input'];
  markAsCompleted?: InputMaybe<Scalars['Boolean']['input']>;
  input: CreateCallHistoryInput;
}>;


export type CreateCallHistoryMutation = { __typename?: 'Mutation', createCallHistory: { __typename?: 'CreateCallHistoryPayload', callHistory: { __typename?: 'CallHistory', id: string } } };

export type UpsertDialerContactMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  powerDialerId: Scalars['ID']['input'];
  leadIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type UpsertDialerContactMutation = { __typename?: 'Mutation', upsertDialerContact: { __typename?: 'UpsertDialerContactsPayload', newLeadsCount: number } };

export type CreatePowerDialerMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreatePowerDialerInput;
}>;


export type CreatePowerDialerMutation = { __typename?: 'Mutation', createPowerDialer: { __typename?: 'CreatePowerDialerPayload', powerDialer: { __typename?: 'PowerDialer', id: string, title: string } } };

export type CallCenterReportQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type CallCenterReportQuery = { __typename?: 'Query', callCenterReport: { __typename?: 'CallCenterReport', totalCalls: number, successRate: number, averageCallDuration: number, aiSdrCalls: number } };

export type CallHistoriesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  powerDialerId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CallHistoriesQuery = { __typename?: 'Query', callHistories: { __typename?: 'CallHistoryConnection', edges: Array<{ __typename?: 'CallHistoryEdge', node: { __typename?: 'CallHistory', id: string, duration: number, dialerMode: DialerMode, disposition?: string | null, createdAt: any, contact: { __typename?: 'DialerContact', lead: { __typename?: 'Lead', id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, address?: string | null, score: number, tags: Array<string>, company?: string | null, createdAt: any, updatedAt?: any | null } } } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } };

export type DialerContactsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  powerDialerId: Scalars['ID']['input'];
}>;


export type DialerContactsQuery = { __typename?: 'Query', dialerContacts: { __typename?: 'DialerContactConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'DialerContactEdge', node: { __typename?: 'DialerContact', id: string, lead: { __typename?: 'Lead', id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, address?: string | null, score: number, tags: Array<string>, company?: string | null, createdAt: any, updatedAt?: any | null } } }> } };

export type PowerDialersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
}>;


export type PowerDialersQuery = { __typename?: 'Query', powerDialers: { __typename?: 'PowerDialerConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'PowerDialerEdge', node: { __typename?: 'PowerDialer', id: string, title: string, successRate: number, totalDuration: number } }> } };

export type PowerDialerDetailsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
}>;


export type PowerDialerDetailsQuery = { __typename?: 'Query', powerDialer: { __typename?: 'PowerDialer', id: string, title: string, successRate: number, totalDuration: number } };

export type CreatePromptMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreatePromptInput;
}>;


export type CreatePromptMutation = { __typename?: 'Mutation', createPrompt: { __typename?: 'CreatePromptPayload', prompt: { __typename?: 'Prompt', id: string, name: string, description?: string | null, content: string, type: string, category: string, tags?: Array<string> | null, createdAt: any, updatedAt?: any | null } } };

export type UpdatePromptMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  input: UpdatePromptInput;
}>;


export type UpdatePromptMutation = { __typename?: 'Mutation', updatePrompt: { __typename?: 'UpdatePromptPayload', prompt: { __typename?: 'Prompt', id: string, name: string, description?: string | null, content: string, type: string, category: string, tags?: Array<string> | null, createdAt: any, updatedAt?: any | null } } };

export type DeletePromptMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type DeletePromptMutation = { __typename?: 'Mutation', deletePrompt: { __typename?: 'DeletePromptPayload', deletedPromptId: string } };

export type PromptsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
}>;


export type PromptsQuery = { __typename?: 'Query', prompts: { __typename?: 'PromptConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'PromptEdge', cursor: string, node: { __typename?: 'Prompt', id: string, name: string, description?: string | null, content: string, type: string, category: string, tags?: Array<string> | null, createdAt: any, updatedAt?: any | null } }> } };

export type PropertiesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
}>;


export type PropertiesQuery = { __typename?: 'Query', properties: { __typename?: 'PropertyConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'PropertyEdge', node: { __typename?: 'Property', id: string, address?: any | null, useCode?: string | null, lotSquareFeet?: number | null, buildingSquareFeet?: number | null, auctionDate?: any | null, assessedValue?: number | null, estimatedValue?: number | null, ownerName?: string | null, ownerOccupied: boolean, yearBuilt?: number | null } }> } };

export type CreateAiSdrAvatarMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreateAiSdrAvatarInput;
}>;


export type CreateAiSdrAvatarMutation = { __typename?: 'Mutation', createAiSdrAvatar: { __typename?: 'CreateAiSdrAvatarPayload', avatar: { __typename?: 'AiSdrAvatar', id: string } } };

export type UpdateAiSdrAvatarMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  input: UpdateAiSdrAvatarInput;
}>;


export type UpdateAiSdrAvatarMutation = { __typename?: 'Mutation', updateAiSdrAvatar: { __typename?: 'UpdateAiSdrAvatarPayload', avatar: { __typename?: 'AiSdrAvatar', id: string, name: string, description?: string | null, personality: string, voiceType: string, avatarUri?: string | null, active: boolean, industry: string, mission: string, goal: string, roles: Array<string>, tags: Array<string>, createdAt: any, updatedAt?: any | null, faqs: Array<{ __typename?: 'AiSdrFaq', question: string, answer: string }> } } };

export type DeleteAiSdrAvatarMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type DeleteAiSdrAvatarMutation = { __typename?: 'Mutation', deleteAiSdrAvatar: { __typename?: 'DeleteAiSdrAvatarPayload', id: string } };

export type AiSdrAvatarsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  searchQuery?: InputMaybe<Scalars['String']['input']>;
}>;


export type AiSdrAvatarsQuery = { __typename?: 'Query', aiSdrAvatars: { __typename?: 'AiSdrAvatarConnection', edges: Array<{ __typename?: 'AiSdrAvatarEdge', node: { __typename?: 'AiSdrAvatar', id: string, name: string, industry: string, tags: Array<string>, active: boolean, avatarUri?: string | null, description?: string | null, personality: string } }>, pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number } } };

export type AiSdrAvatarDetailsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type AiSdrAvatarDetailsQuery = { __typename?: 'Query', aiSdrAvatar: { __typename?: 'AiSdrAvatar', id: string, name: string, description?: string | null, personality: string, voiceType: string, avatarUri?: string | null, active: boolean, industry: string, mission: string, goal: string, roles: Array<string>, tags: Array<string>, faqs: Array<{ __typename?: 'AiSdrFaq', question: string, answer: string }> } };

export type AiSdrSelectorQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  searchQuery?: InputMaybe<Scalars['String']['input']>;
}>;


export type AiSdrSelectorQuery = { __typename?: 'Query', aiSdrAvatars: { __typename?: 'AiSdrAvatarConnection', edges: Array<{ __typename?: 'AiSdrAvatarEdge', node: { __typename?: 'AiSdrAvatar', id: string, name: string, description?: string | null, industry: string, tags: Array<string>, avatarUri?: string | null, mission: string, goal: string, roles: Array<string>, faqs: Array<{ __typename?: 'AiSdrFaq', question: string, answer: string }> } }> } };

export type UpdateSendgridSettingsMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: SendgridSettingsInput;
}>;


export type UpdateSendgridSettingsMutation = { __typename?: 'Mutation', updateSendgridSettings: { __typename?: 'UpdateSendgridSettingsPayload', settings: { __typename?: 'SendgridSettings', teamId: string, sendgridApiKey?: string | null, sendgridFromName?: string | null, sendgridFromEmail?: string | null, sendgridReplyToEmail?: string | null, sendgridEventTypes?: Array<string> | null, sendgridDailyLimit?: number | null, sendgridBatchSize?: number | null, sendgridIpPool?: string | null, sendgridEmailCategory?: string | null, sendgridEnableClickTracking?: boolean | null, sendgridEnableOpenTracking?: boolean | null, sendgridEnableSubscriptionTracking?: boolean | null, sendgridDefaultFooter?: string | null } } };

export type TestSendgridSendEmailMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  email: Scalars['String']['input'];
}>;


export type TestSendgridSendEmailMutation = { __typename?: 'Mutation', testSendgridSendEmail: boolean };

export type SendgridSettingsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type SendgridSettingsQuery = { __typename?: 'Query', sendgridSettings: { __typename?: 'SendgridSettings', teamId: string, sendgridApiKey?: string | null, sendgridFromName?: string | null, sendgridFromEmail?: string | null, sendgridReplyToEmail?: string | null, sendgridEventTypes?: Array<string> | null, sendgridDailyLimit?: number | null, sendgridBatchSize?: number | null, sendgridIpPool?: string | null, sendgridEmailCategory?: string | null, sendgridEnableClickTracking?: boolean | null, sendgridEnableOpenTracking?: boolean | null, sendgridEnableSubscriptionTracking?: boolean | null, sendgridDefaultFooter?: string | null } };

export type UpsertBusinessListSettingsMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: BusinessListSettingsInput;
}>;


export type UpsertBusinessListSettingsMutation = { __typename?: 'Mutation', upsertBusinessListSettings: { __typename?: 'UpsertBusinessListSettingsPayload', settings: { __typename?: 'BusinessListSettings', teamId: string, businessListApiToken?: string | null } } };

export type InviteTeamMemberMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: InviteTeamMemberInput;
}>;


export type InviteTeamMemberMutation = { __typename?: 'Mutation', inviteTeamMember: { __typename?: 'InviteTeamPayload', teamInvitation: { __typename?: 'TeamInvitation', id: string } } };

export type CreateTeamAccountMutationVariables = Exact<{
  code: Scalars['String']['input'];
  input: CreateTeamAccountInput;
}>;


export type CreateTeamAccountMutation = { __typename?: 'Mutation', createTeamAccount: { __typename?: 'CreateTeamAccountPayload', token: string, team: { __typename?: 'Team', id: string, slug: string } } };

export type RemoveTeamMemberMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  memberId: Scalars['ID']['input'];
}>;


export type RemoveTeamMemberMutation = { __typename?: 'Mutation', removeTeamMember: boolean };

export type RemoveTeamInvitationMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type RemoveTeamInvitationMutation = { __typename?: 'Mutation', removeTeamInvitation: { __typename?: 'RemoveTeamInvitationPayload', removedId: string } };

export type ResendTeamInvitationMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type ResendTeamInvitationMutation = { __typename?: 'Mutation', resendTeamInvitation: { __typename?: 'ResendTeamInvitationPayload', teamInvitation: { __typename?: 'TeamInvitation', id: string, createdAt: any } } };

export type BusinessListSettingsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type BusinessListSettingsQuery = { __typename?: 'Query', businessListSettings: { __typename?: 'BusinessListSettings', teamId: string, businessListApiToken?: string | null } };

export type TeamMembersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
}>;


export type TeamMembersQuery = { __typename?: 'Query', teamMembers: { __typename?: 'TeamMemberConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'TeamMemberEdge', node: { __typename?: 'TeamMember', id: string, role: string, status: string, user?: { __typename?: 'User', id: string, name: string, email: string } | null } }> } };

export type TeamInvitationsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
}>;


export type TeamInvitationsQuery = { __typename?: 'Query', teamInvitations: { __typename?: 'TeamInvitationConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'TeamInvitationEdge', node: { __typename?: 'TeamInvitation', id: string, role: string, email: string, createdAt: any, invitedBy?: { __typename?: 'User', id: string, email: string, name: string } | null } }> } };

export type TeamInvitationByCodeQueryVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type TeamInvitationByCodeQuery = { __typename?: 'Query', teamInvitationByCode?: { __typename?: 'TeamInvitation', id: string, role: string, email: string, createdAt: any, invitedBy?: { __typename?: 'User', id: string, email: string, name: string } | null } | null };

export type BasicTeamReportQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type BasicTeamReportQuery = { __typename?: 'Query', teamReport: { __typename?: 'TeamReport', propertiesCount: number, verifiedLeadsCount: number, highScoreLeadsCount: number, enrichedLeadsCount: number } };

export type FirstTeamQueryVariables = Exact<{ [key: string]: never; }>;


export type FirstTeamQuery = { __typename?: 'Query', firstTeam?: { __typename?: 'Team', id: string, slug: string } | null };

export type TeamQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TeamQuery = { __typename?: 'Query', team: { __typename?: 'Team', id: string, name: string, slug: string, description?: string | null } };

export type UpdateTwilioSettingsMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: TwilioSettingsInput;
}>;


export type UpdateTwilioSettingsMutation = { __typename?: 'Mutation', updateTwilioSettings: { __typename?: 'UpdateTwilioSettingsPayload', settings: { __typename?: 'TwilioSettings', twilioAccountSid?: string | null, twilioAuthToken?: string | null, twilioApiKey?: string | null, twilioApiSecret?: string | null, twilioDefaultPhoneNumber?: string | null, twiMLAppSid?: string | null, twilioEnableVoiceCalls?: boolean | null, twilioEnableRecordCalls?: boolean | null, twilioTranscribeVoicemail?: boolean | null, twilioCallTimeout?: number | null, twilioDefaultVoiceMessage?: string | null, twilioEnableSms?: boolean | null } } };

export type TestTwilioSendSmsMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type TestTwilioSendSmsMutation = { __typename?: 'Mutation', testTwilioSendSms: boolean };

export type PurchaseTwilioPhoneMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  areaCode: Scalars['String']['input'];
  friendlyName: Scalars['String']['input'];
}>;


export type PurchaseTwilioPhoneMutation = { __typename?: 'Mutation', purchaseTwilioPhone: { __typename?: 'PurchaseTwilioPhonePayload', phone: { __typename?: 'TwilioPhone', sid: string, phoneNumber: string, friendlyName: string, status: string, capabilities: { __typename?: 'TwilioPhoneCapability', voice: boolean, sms: boolean, mms: boolean } } } };

export type DeleteTwilioPhoneMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  sid: Scalars['ID']['input'];
}>;


export type DeleteTwilioPhoneMutation = { __typename?: 'Mutation', deleteTwilioPhone: { __typename?: 'DeleteTwilioPhonePayload', deletedSid: string } };

export type TwilioSettingsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type TwilioSettingsQuery = { __typename?: 'Query', twilioSettings: { __typename?: 'TwilioSettings', teamId: string, twilioAccountSid?: string | null, twilioAuthToken?: string | null, twilioApiKey?: string | null, twilioApiSecret?: string | null, twilioDefaultPhoneNumber?: string | null, twiMLAppSid?: string | null, twilioEnableVoiceCalls?: boolean | null, twilioEnableRecordCalls?: boolean | null, twilioTranscribeVoicemail?: boolean | null, twilioCallTimeout?: number | null, twilioDefaultVoiceMessage?: string | null, twilioEnableSms?: boolean | null } };

export type TwilioPhonesQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type TwilioPhonesQuery = { __typename?: 'Query', twilioPhones: Array<{ __typename?: 'TwilioPhone', sid: string, phoneNumber: string, friendlyName: string, status: string, capabilities: { __typename?: 'TwilioPhoneCapability', voice: boolean, sms: boolean, mms: boolean } }> };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'LoginPayload', token: string, user: { __typename?: 'User', id: string, email: string, name: string, role: string } } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', user: { __typename?: 'User', id: string, name: string } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, email: string, name: string, role: string }, firstTeam?: { __typename?: 'Team', id: string, slug: string } | null };

export type CreateWorkflowMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  input: CreateWorkflowInput;
}>;


export type CreateWorkflowMutation = { __typename?: 'Mutation', createWorkflow: { __typename?: 'CreateWorkflowPayload', workflow: { __typename?: 'Workflow', id: string, name: string } } };

export type WorkflowsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  active?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type WorkflowsQuery = { __typename?: 'Query', workflows: { __typename?: 'WorkflowConnection', pageInfo: { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number }, edges: Array<{ __typename?: 'WorkflowEdge', node: { __typename?: 'Workflow', id: string, name: string, trigger: { __typename?: 'WorkflowTask', id: string, label: string } } }> } };

export type PageInfoFragment = { __typename?: 'PageInfo', startCursor?: string | null, endCursor?: string | null, hasNextPage: boolean, hasPrevPage: boolean, total: number, totalPerPage: number };

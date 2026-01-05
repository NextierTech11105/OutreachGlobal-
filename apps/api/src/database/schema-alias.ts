import { aiSdrAvatars } from "./schema/ai-sdr-avatars.schema";
import {
  campaignEvents,
  campaignExecutions,
  campaignLeads,
  campaigns,
  campaignSequences,
} from "./schema/campaigns.schema";
import {
  integrationFields,
  integrations,
  integrationTasks,
} from "./schema/integrations.schema";
import {
  importLeadPresets,
  leadPhoneNumbers,
  leads,
} from "./schema/leads.schema";
import { businessOwners, businesses } from "./schema/business-owner.schema";
import { propertyOwners } from "./schema/property-owner.schema";
import { skiptraceResults } from "./schema/skiptrace-result.schema";
import {
  unifiedLeadCards,
  unifiedLeadCardsRef,
  leadActivities,
  campaignQueue,
} from "./schema/unified-lead-card.schema";
import {
  personas,
  personasRef,
  personaMergeHistory,
} from "./schema/persona.schema";
import { personaPhones, personaPhonesRef } from "./schema/phone.schema";
import { personaEmails, personaEmailsRef } from "./schema/email.schema";
import { personaSocials, personaSocialsRef } from "./schema/social.schema";
import {
  personaAddresses,
  personaAddressesRef,
} from "./schema/address-history.schema";
import {
  personaDemographics,
  personaDemographicsRef,
} from "./schema/demographics.schema";
import { teamSettings } from "./schema/team-settings.schema";
import { messageTemplates } from "./schema/message-templates.schema";
import {
  messageLabelLinks,
  messageLabels,
  messages,
} from "./schema/messages.schema";
import {
  callHistories,
  callRecordings,
  dialerContacts,
  powerDialers,
} from "./schema/power-dialers.schema";
import { prompts } from "./schema/prompts.schema";
import { properties, propertyDistressScores } from "./schema/properties.schema";
import {
  propertySearchBlocks,
  propertySearches,
} from "./schema/property-searches.schema";
import { teamInvitations, teamMembers, teams } from "./schema/teams.schema";
import { personalAccessTokens, users } from "./schema/users.schema";
import {
  workflowFields,
  workflows,
  workflowSteps,
  workflowTaskFields,
  workflowTasks,
} from "./schema/workflows.schema";

export const usersTable = users;
export const personalAccessTokensTable = personalAccessTokens;

export const teamsTable = teams;
export const teamMembersTable = teamMembers;
export const teamInvitationsTable = teamInvitations;

export const messageTemplatesTable = messageTemplates;

export const workflowsTable = workflows;
export const workflowStepsTable = workflowSteps;
export const workflowFieldsTable = workflowFields;
export const workflowTasksTable = workflowTasks;
export const workflowTaskFieldsTable = workflowTaskFields;

export const integrationsTable = integrations;
export const integrationFieldsTable = integrationFields;
export const integrationTasksTable = integrationTasks;

export const leadsTable = leads;
export const leadPhoneNumbersTable = leadPhoneNumbers;
export const leadPhoneNumberTable = leadPhoneNumbers; // Singular alias for backward compatibility
export const importLeadPresetsTable = importLeadPresets;

export const aiSdrAvatarsTable = aiSdrAvatars;

export const campaignsTable = campaigns;
export const campaignLeadsTable = campaignLeads;
export const campaignSequencesTable = campaignSequences;
export const campaignEventsTable = campaignEvents;
export const campaignExecutionsTable = campaignExecutions;

export const promptsTable = prompts;

export const propertyDistressScoresTable = propertyDistressScores;
export const propertiesTable = properties;
export const propertySearchesTable = propertySearches;
export const propertySearchBlocksTable = propertySearchBlocks;

export const businessesTable = businesses;
export const businessOwnersTable = businessOwners;
export const propertyOwnersTable = propertyOwners;
export const skiptraceResultsTable = skiptraceResults;
export const skiptraceResultTable = skiptraceResults; // Singular alias for backward compatibility

export const businessOwnerTable = businessOwners; // Singular alias for backward compatibility
export const propertyOwnerTable = propertyOwners; // Singular alias for backward compatibility

export const powerDialersTable = powerDialers;
export const dialerContactsTable = dialerContacts;
export const callHistoriesTable = callHistories;
export const callRecordingsTable = callRecordings;

export const messagesTable = messages;
export const messageLabelsTable = messageLabels;
export const messageLabelLinksTable = messageLabelLinks;

// Inbox & Response Pipeline
import {
  inboxItems,
  responseBuckets,
  bucketMovements,
  suppressionList,
  aiResponseApprovals,
} from "./schema/inbox.schema";
export const inboxItemsTable = inboxItems;
export const responseBucketsTable = responseBuckets;
export const bucketMovementsTable = bucketMovements;
export const suppressionListTable = suppressionList;
export const aiResponseApprovalsTable = aiResponseApprovals;

// Achievements & Gamification
import {
  achievementDefinitions,
  userAchievements,
  userStats,
  achievementNotifications,
  leaderboardSnapshots,
} from "./schema/achievements.schema";
export const achievementDefinitionsTable = achievementDefinitions;
export const userAchievementsTable = userAchievements;
export const userStatsTable = userStats;
export const achievementNotificationsTable = achievementNotifications;
export const leaderboardSnapshotsTable = leaderboardSnapshots;

// Initial Messages & SDR Config
import {
  initialMessages,
  campaignInitialMessages,
  sdrCampaignConfigs,
} from "./schema/initial-messages.schema";
export const initialMessagesTable = initialMessages;
export const campaignInitialMessagesTable = campaignInitialMessages;
export const sdrCampaignConfigsTable = sdrCampaignConfigs;

// Content Library
import {
  contentCategories,
  contentItems,
  contentUsageLogs,
} from "./schema/content-library.schema";
export const contentCategoriesTable = contentCategories;
export const contentItemsTable = contentItems;
export const contentUsageLogsTable = contentUsageLogs;

// Persona & Identity Graph
export const personasTable = personas;
export const personasRefTable = personasRef;
export const personaMergeHistoryTable = personaMergeHistory;

// Persona Contact Info
export const personaPhonesTable = personaPhones;
export const personaPhonesRefFn = personaPhonesRef;
export const personaEmailsTable = personaEmails;
export const personaEmailsRefFn = personaEmailsRef;
export const personaSocialsTable = personaSocials;
export const personaSocialsRefFn = personaSocialsRef;
export const personaAddressesTable = personaAddresses;
export const personaAddressesRefFn = personaAddressesRef;
export const personaDemographicsTable = personaDemographics;
export const personaDemographicsRefFn = personaDemographicsRef;

// Team Settings
export const teamSettingsTable = teamSettings;

// Unified Lead Cards & Campaign Queue
export const unifiedLeadCardsTable = unifiedLeadCards;
export const unifiedLeadCardsRefTable = unifiedLeadCardsRef;
export const leadActivitiesTable = leadActivities;
export const campaignQueueTable = campaignQueue;

// Operations - Durability tables (replace Redis-only storage)
import {
  callQueue,
  conversationContext,
  eventLog,
} from "./schema/operations.schema";
export const callQueueOperationsTable = callQueue;
export const conversationContextTable = conversationContext;
export const eventLogTable = eventLog;

// API Keys & Tenants
import { apiKeys, tenants, apiKeyUsageLogs } from "./schema/api-keys.schema";
export const apiKeysTable = apiKeys;
export const tenantsTable = tenants;
export const apiKeyUsageLogsTable = apiKeyUsageLogs;

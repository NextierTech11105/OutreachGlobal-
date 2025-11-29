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
} from "./schema/inbox.schema";
export const inboxItemsTable = inboxItems;
export const responseBucketsTable = responseBuckets;
export const bucketMovementsTable = bucketMovements;
export const suppressionListTable = suppressionList;

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

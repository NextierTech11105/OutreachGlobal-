import {
  AnyObject,
  WorkflowFieldDisplayType,
  WorkflowFieldInputType,
  WorkflowFieldValueType,
  WorkflowTaskInputPort,
  WorkflowTaskOutputPort,
  WorkflowTaskType,
} from "@nextier/common";
import { WorkflowFieldInsert } from "../models/workflow-field.model";
import { WorkflowTaskInsert } from "../models/workflow-task.model";
import { getTaskInternalId } from "../utils/workflow-internal-id";
import {
  CAMPAIGN_STARTED,
  LEAD_CREATED,
  LEAD_UPDATED,
} from "@/app/flow/app-event.contants";
import {
  ADD_TAG,
  LEAD_ADD_NOTES,
  LEAD_SEND_EMAIL,
  LEAD_SEND_SMS,
  LEAD_SEND_VOICE,
  LEAD_UPDATE_STATUS,
  REMOVE_TAG,
} from "@/app/flow/app-command.contants";

type WorkflowTask = WorkflowTaskInsert & {
  fields: ({ id: string; metadata?: AnyObject } | string)[];
};

export const workflowFieldsData: WorkflowFieldInsert[] = [
  {
    key: "message_template_id",
    label: "Message Template",
    inputType: WorkflowFieldInputType.SELECT,
    displayType: WorkflowFieldDisplayType.POPOVER,
    resource: "message_templates",
    valueType: WorkflowFieldValueType.STRING,
    possibleObjectTypes: ["MessageTemplate"],
  },
  {
    key: "lead_id",
    label: "Lead",
    description: "the id of lead",
    inputType: WorkflowFieldInputType.SELECT,
    displayType: WorkflowFieldDisplayType.POPOVER,
    valueType: WorkflowFieldValueType.STRING,
    resource: "leads",
    possibleObjectTypes: ["Lead"],
  },
];

const messageTemplateAction = {
  type: WorkflowTaskType.ACTION,
  outputPorts: [WorkflowTaskOutputPort.THEN],
  inputPort: WorkflowTaskInputPort.INPUT,
  paths: ["Actions", "Lead"],
  objectTypes: ["Lead", "MessageTemplate"],
};

export const workflowTaskTriggersData: WorkflowTask[] = [
  {
    id: getTaskInternalId(LEAD_CREATED),
    label: "Lead Created",
    description: "Trigger when a lead is created.",
    categories: ["Leads"],
    type: WorkflowTaskType.TRIGGER,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Triggers", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(LEAD_UPDATED),
    label: "Lead Updated",
    description: "Trigger when a lead is updated.",
    categories: ["Leads"],
    type: WorkflowTaskType.TRIGGER,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Triggers", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(CAMPAIGN_STARTED),
    label: "Campaign Started",
    description: "Trigger when a campaign is started.",
    categories: ["Campaigns"],
    type: WorkflowTaskType.TRIGGER,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Triggers", "Campaign"],
    objectTypes: ["Campaign"],
    fields: [],
  },
];

export const workflowTaskActionsData: WorkflowTask[] = [
  {
    id: getTaskInternalId(ADD_TAG),
    label: "Add Tag",
    description: "Add tag to lead",
    categories: ["Tags"],
    type: WorkflowTaskType.ACTION,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Actions", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(LEAD_ADD_NOTES),
    label: "Add Notes",
    description: "Add notes to lead",
    categories: ["Notes"],
    type: WorkflowTaskType.ACTION,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Actions", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(REMOVE_TAG),
    label: "Remove Tag",
    description: "Remove tag from lead",
    categories: ["Tags"],
    type: WorkflowTaskType.ACTION,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Actions", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(LEAD_UPDATE_STATUS),
    label: "Update Lead Status",
    description: "Update lead status",
    categories: ["Leads"],
    type: WorkflowTaskType.ACTION,
    outputPorts: [WorkflowTaskOutputPort.THEN],
    paths: ["Actions", "Lead"],
    objectTypes: ["Lead"],
    fields: [],
  },
  {
    id: getTaskInternalId(LEAD_SEND_EMAIL),
    label: "Send Email",
    description: "Send email to lead",
    categories: ["Email"],
    fields: [
      {
        id: "message_template_id",
        metadata: {
          query: "message_templates.type = 'EMAIL'",
        },
      },
    ],
    ...messageTemplateAction,
  },
  {
    id: getTaskInternalId(LEAD_SEND_SMS),
    label: "Send SMS",
    description: "Send SMS to lead",
    categories: ["SMS"],
    fields: [
      {
        id: "message_template_id",
        metadata: {
          query: "message_templates.type = 'SMS'",
        },
      },
    ],
    ...messageTemplateAction,
  },
  {
    id: getTaskInternalId(LEAD_SEND_VOICE),
    label: "Send Voice",
    description: "Send voice to lead",
    categories: ["Voice"],
    fields: [
      {
        id: "message_template_id",
        metadata: {
          query: "message_templates.type = 'VOICE'",
        },
      },
    ],
    ...messageTemplateAction,
  },
];

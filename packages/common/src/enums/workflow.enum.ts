export enum WorkflowTaskType {
  TRIGGER = "TRIGGER",
  ACTION = "ACTION",
  CONDITION = "CONDITION",
}

export enum WorkflowTaskOutputPort {
  THEN = "THEN",
  OTHERWISE = "OTHERWISE",
}

export enum WorkflowTaskInputPort {
  INPUT = "INPUT",
}

export enum WorkflowFieldInputType {
  SELECT = "SELECT",
  INPUT = "INPUT",
  TEXTAREA = "TEXTAREA",
}

export enum WorkflowFieldDisplayType {
  POPOVER = "POPOVER",
}

export enum WorkflowFieldValueType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  ARRAY_STRING = "ARRAY_STRING",
}

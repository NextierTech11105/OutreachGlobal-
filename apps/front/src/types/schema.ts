// Schema Types

export interface SchemaField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  searchable: boolean;
  defaultValue?: string;
  options?: string[];
  reference?: string;
  description?: string;
  validation?: string;
  isSystem?: boolean;
  isHidden?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  isAudited?: boolean;
  group?: string;
  order?: number;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "array"
  | "object"
  | "reference"
  | "phone"
  | "email"
  | "url"
  | "address"
  | "currency"
  | "percentage"
  | "richtext"
  | "file"
  | "image"
  | "json";

export interface SchemaEntity {
  name: string;
  description: string;
  fields: SchemaField[];
  isSystem?: boolean;
  isAudited?: boolean;
  displayField?: string;
  searchFields?: string[];
  defaultSort?: string;
  defaultSortDirection?: "asc" | "desc";
  relationships?: SchemaRelationship[];
  permissions?: SchemaPermission[];
  timestamps?: boolean;
  softDelete?: boolean;
}

export interface SchemaRelationship {
  name: string;
  type: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";
  entity: string;
  field: string;
  inverseField?: string;
  isRequired?: boolean;
  cascade?: boolean;
}

export interface SchemaPermission {
  role: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  fields?: {
    [key: string]: {
      read: boolean;
      update: boolean;
    };
  };
}

export interface Schema {
  [key: string]: SchemaEntity;
}

// Zoho CRM Integration Types

export interface ZohoField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  customField?: boolean;
}

export interface ZohoModule {
  name: string;
  fields: ZohoField[];
}

export interface FieldMapping {
  zohoField: ZohoField;
  localField: SchemaField;
  enabled: boolean;
  transformFunction?: string;
}

export interface ZohoMapping {
  zohoModule: string;
  localEntity: string;
  mappings: FieldMapping[];
  autoSync: boolean;
  syncDirection: "bidirectional" | "to_zoho" | "from_zoho";
  syncSchedule?: string;
  lastSynced?: Date;
}

// Real Estate API Types

export interface PropertyField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  apiField?: string;
  required?: boolean;
  searchable?: boolean;
  defaultValue?: string;
}

export interface PropertySchema {
  name: string;
  description: string;
  fields: PropertyField[];
  apiEndpoint?: string;
  apiVersion?: string;
  apiAuthType?: "apiKey" | "oauth" | "basic";
}

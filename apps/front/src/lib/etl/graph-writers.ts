/**
 * NEXTIER UNIFIED GRAPH ETL - Graph Writers
 * Writes nodes (entities) and edges (relationships) to DO Spaces in graph format
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TYPES
// ============================================================================

export type NodeType =
  | "property" // Real estate property
  | "business" // B2B business entity
  | "contact" // Individual person
  | "phone" // Phone number
  | "email" // Email address
  | "address" // Physical address
  | "owner" // Property owner
  | "campaign"; // Outreach campaign

export type EdgeType =
  | "owns" // owner -> property
  | "works_at" // contact -> business
  | "located_at" // business -> address, property -> address
  | "has_phone" // contact -> phone, business -> phone
  | "has_email" // contact -> email, business -> email
  | "contacted_by" // contact -> campaign
  | "occupies" // business -> property
  | "associated"; // generic relationship

export interface GraphNode {
  id: string; // UUID
  type: NodeType;
  normalizedKey: string; // Deduplication key (e.g., normalized address, phone)
  data: Record<string, unknown>; // Entity data
  sources: string[]; // Source bucket IDs that contributed to this node
  createdAt: string;
  updatedAt: string;
  confidence: number; // 0-1 confidence score
}

export interface GraphEdge {
  id: string;
  type: EdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  weight: number; // Relationship strength 0-1
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface GraphWriteResult {
  nodesWritten: number;
  edgesWritten: number;
  nodesUpdated: number;
  errors: string[];
}

// ============================================================================
// S3 CLIENT
// ============================================================================

function getS3Client(): S3Client {
  return new S3Client({
    endpoint:
      process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
    region: process.env.DO_SPACES_REGION || "nyc3",
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY || "",
      secretAccessKey: process.env.DO_SPACES_SECRET || "",
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.DO_SPACES_BUCKET || "nextier";
const GRAPH_PREFIX = "unified-graph";

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

interface NodeIndex {
  [normalizedKey: string]: {
    nodeId: string;
    type: NodeType;
    path: string;
  };
}

/**
 * Load node index for a specific type
 */
async function loadNodeIndex(type: NodeType): Promise<NodeIndex> {
  const client = getS3Client();
  const key = `${GRAPH_PREFIX}/indexes/${type}-index.json`;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

/**
 * Save node index for a specific type
 */
async function saveNodeIndex(type: NodeType, index: NodeIndex): Promise<void> {
  const client = getS3Client();
  const key = `${GRAPH_PREFIX}/indexes/${type}-index.json`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(index),
      ContentType: "application/json",
    }),
  );
}

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Write or update a node in the graph
 * Deduplicates based on normalizedKey
 */
export async function writeNode(
  type: NodeType,
  normalizedKey: string,
  data: Record<string, unknown>,
  sourceId: string,
  confidence: number = 0.8,
): Promise<{ nodeId: string; isNew: boolean }> {
  const client = getS3Client();
  const index = await loadNodeIndex(type);

  const existing = index[normalizedKey];
  const now = new Date().toISOString();

  if (existing) {
    // Update existing node - merge data
    const nodePath = existing.path;
    const response = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: nodePath,
      }),
    );
    const existingNode: GraphNode = JSON.parse(
      (await response.Body?.transformToString()) || "{}",
    );

    // Merge data, add source if new
    const updatedNode: GraphNode = {
      ...existingNode,
      data: { ...existingNode.data, ...data },
      sources: [...new Set([...existingNode.sources, sourceId])],
      updatedAt: now,
      confidence: Math.max(existingNode.confidence, confidence),
    };

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: nodePath,
        Body: JSON.stringify(updatedNode),
        ContentType: "application/json",
      }),
    );

    return { nodeId: existing.nodeId, isNew: false };
  }

  // Create new node
  const nodeId = uuidv4();
  const datePrefix = now.slice(0, 7).replace("-", "/"); // YYYY/MM
  const nodePath = `${GRAPH_PREFIX}/nodes/${type}/${datePrefix}/${nodeId}.json`;

  const newNode: GraphNode = {
    id: nodeId,
    type,
    normalizedKey,
    data,
    sources: [sourceId],
    createdAt: now,
    updatedAt: now,
    confidence,
  };

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: nodePath,
      Body: JSON.stringify(newNode),
      ContentType: "application/json",
    }),
  );

  // Update index
  index[normalizedKey] = { nodeId, type, path: nodePath };
  await saveNodeIndex(type, index);

  return { nodeId, isNew: true };
}

/**
 * Get a node by its normalized key
 */
export async function getNodeByKey(
  type: NodeType,
  normalizedKey: string,
): Promise<GraphNode | null> {
  const client = getS3Client();
  const index = await loadNodeIndex(type);
  const entry = index[normalizedKey];

  if (!entry) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: entry.path,
      }),
    );
    return JSON.parse((await response.Body?.transformToString()) || "null");
  } catch {
    return null;
  }
}

/**
 * Get a node by ID
 */
export async function getNodeById(
  type: NodeType,
  nodeId: string,
): Promise<GraphNode | null> {
  const client = getS3Client();

  // List potential paths (node could be in any month folder)
  const prefix = `${GRAPH_PREFIX}/nodes/${type}/`;
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
    }),
  );

  for (const obj of response.Contents || []) {
    if (obj.Key?.endsWith(`${nodeId}.json`)) {
      try {
        const nodeResponse = await client.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }),
        );
        return JSON.parse(
          (await nodeResponse.Body?.transformToString()) || "null",
        );
      } catch {
        return null;
      }
    }
  }

  return null;
}

// ============================================================================
// EDGE OPERATIONS
// ============================================================================

/**
 * Write an edge between two nodes
 */
export async function writeEdge(
  type: EdgeType,
  sourceNodeId: string,
  targetNodeId: string,
  weight: number = 1.0,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const client = getS3Client();
  const edgeId = uuidv4();
  const now = new Date().toISOString();
  const datePrefix = now.slice(0, 7).replace("-", "/");

  const edge: GraphEdge = {
    id: edgeId,
    type,
    sourceNodeId,
    targetNodeId,
    weight,
    metadata,
    createdAt: now,
  };

  // Store edge in both source and target paths for efficient querying
  const sourcePath = `${GRAPH_PREFIX}/edges/by-source/${sourceNodeId}/${edgeId}.json`;
  const targetPath = `${GRAPH_PREFIX}/edges/by-target/${targetNodeId}/${edgeId}.json`;
  const typePath = `${GRAPH_PREFIX}/edges/by-type/${type}/${datePrefix}/${edgeId}.json`;

  await Promise.all([
    client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: sourcePath,
        Body: JSON.stringify(edge),
        ContentType: "application/json",
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: targetPath,
        Body: JSON.stringify(edge),
        ContentType: "application/json",
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: typePath,
        Body: JSON.stringify(edge),
        ContentType: "application/json",
      }),
    ),
  ]);

  return edgeId;
}

/**
 * Get all edges from a source node
 */
export async function getEdgesFromNode(
  sourceNodeId: string,
): Promise<GraphEdge[]> {
  const client = getS3Client();
  const prefix = `${GRAPH_PREFIX}/edges/by-source/${sourceNodeId}/`;

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
    }),
  );

  const edges: GraphEdge[] = [];
  for (const obj of response.Contents || []) {
    if (obj.Key) {
      try {
        const edgeResponse = await client.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }),
        );
        const edge = JSON.parse(
          (await edgeResponse.Body?.transformToString()) || "null",
        );
        if (edge) edges.push(edge);
      } catch {
        // Skip invalid edges
      }
    }
  }

  return edges;
}

/**
 * Get all edges to a target node
 */
export async function getEdgesToNode(
  targetNodeId: string,
): Promise<GraphEdge[]> {
  const client = getS3Client();
  const prefix = `${GRAPH_PREFIX}/edges/by-target/${targetNodeId}/`;

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
    }),
  );

  const edges: GraphEdge[] = [];
  for (const obj of response.Contents || []) {
    if (obj.Key) {
      try {
        const edgeResponse = await client.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }),
        );
        const edge = JSON.parse(
          (await edgeResponse.Body?.transformToString()) || "null",
        );
        if (edge) edges.push(edge);
      } catch {
        // Skip invalid edges
      }
    }
  }

  return edges;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Write multiple nodes efficiently
 */
export async function writeNodesBatch(
  nodes: Array<{
    type: NodeType;
    normalizedKey: string;
    data: Record<string, unknown>;
    confidence?: number;
  }>,
  sourceId: string,
): Promise<GraphWriteResult> {
  const result: GraphWriteResult = {
    nodesWritten: 0,
    edgesWritten: 0,
    nodesUpdated: 0,
    errors: [],
  };

  // Group nodes by type for efficient index loading
  const nodesByType = new Map<NodeType, typeof nodes>();
  for (const node of nodes) {
    const group = nodesByType.get(node.type) || [];
    group.push(node);
    nodesByType.set(node.type, group);
  }

  // Process each type
  for (const [type, typeNodes] of nodesByType) {
    const index = await loadNodeIndex(type);

    for (const node of typeNodes) {
      try {
        const { isNew } = await writeNode(
          node.type,
          node.normalizedKey,
          node.data,
          sourceId,
          node.confidence,
        );

        if (isNew) {
          result.nodesWritten++;
        } else {
          result.nodesUpdated++;
        }
      } catch (error) {
        result.errors.push(`Failed to write ${type} node: ${error}`);
      }
    }
  }

  return result;
}

/**
 * Write multiple edges efficiently
 */
export async function writeEdgesBatch(
  edges: Array<{
    type: EdgeType;
    sourceNodeId: string;
    targetNodeId: string;
    weight?: number;
    metadata?: Record<string, unknown>;
  }>,
): Promise<number> {
  let written = 0;

  for (const edge of edges) {
    try {
      await writeEdge(
        edge.type,
        edge.sourceNodeId,
        edge.targetNodeId,
        edge.weight,
        edge.metadata,
      );
      written++;
    } catch {
      // Skip failed edges
    }
  }

  return written;
}

// ============================================================================
// GRAPH TRAVERSAL HELPERS
// ============================================================================

/**
 * Find connected nodes (1-hop neighbors)
 */
export async function findConnectedNodes(nodeId: string): Promise<{
  outgoing: Array<{ edge: GraphEdge; targetId: string }>;
  incoming: Array<{ edge: GraphEdge; sourceId: string }>;
}> {
  const [outEdges, inEdges] = await Promise.all([
    getEdgesFromNode(nodeId),
    getEdgesToNode(nodeId),
  ]);

  return {
    outgoing: outEdges.map((edge) => ({ edge, targetId: edge.targetNodeId })),
    incoming: inEdges.map((edge) => ({ edge, sourceId: edge.sourceNodeId })),
  };
}

/**
 * Check if an edge exists between two nodes
 */
export async function edgeExists(
  sourceNodeId: string,
  targetNodeId: string,
): Promise<boolean> {
  const edges = await getEdgesFromNode(sourceNodeId);
  return edges.some((e) => e.targetNodeId === targetNodeId);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  nodesByType: Record<NodeType, number>;
  totalNodes: number;
  totalEdges: number;
}> {
  const client = getS3Client();
  const stats: Record<NodeType, number> = {
    property: 0,
    business: 0,
    contact: 0,
    phone: 0,
    email: 0,
    address: 0,
    owner: 0,
    campaign: 0,
  };

  for (const type of Object.keys(stats) as NodeType[]) {
    const index = await loadNodeIndex(type);
    stats[type] = Object.keys(index).length;
  }

  // Count edges (approximate by counting files in edges directory)
  const edgeResponse = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${GRAPH_PREFIX}/edges/by-type/`,
      MaxKeys: 1,
    }),
  );

  return {
    nodesByType: stats,
    totalNodes: Object.values(stats).reduce((a, b) => a + b, 0),
    totalEdges: edgeResponse.KeyCount || 0,
  };
}

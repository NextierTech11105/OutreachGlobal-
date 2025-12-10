/**
 * NEXTIER ETL Module
 * Unified Graph ETL for Entity Resolution
 */

// Normalizers - standardize data for deduplication
export {
  normalizePhone,
  normalizeEmail,
  normalizeAddress,
  normalizeName,
  normalizeCompanyName,
  normalizeSIC,
  normalizeZip,
  normalizeState,
} from "./normalizers";

// Graph Writers - create nodes and edges
export {
  writeNode,
  writeEdge,
  writeNodesBatch,
  writeEdgesBatch,
  getNodeByKey,
  getNodeById,
  getEdgesFromNode,
  getEdgesToNode,
  findConnectedNodes,
  edgeExists,
  getGraphStats,
  type NodeType,
  type EdgeType,
  type GraphNode,
  type GraphEdge,
  type GraphWriteResult,
} from "./graph-writers";

// ETL Process - transform bucket data into graph
export {
  processBucket,
  processAllBuckets,
  processIncrementalBucket,
  queueBucketForETL,
  getETLStatus,
} from "./unified-graph-etl";

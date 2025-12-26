// Shared in-memory storage for batches
// This allows cross-route access without exporting from API routes

export const batches: Map<string, any> = new Map();

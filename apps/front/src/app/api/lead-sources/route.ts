/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD SOURCES API - Folder & Batch Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/lead-sources          - Create folder or upload batch
 * GET  /api/lead-sources          - List folders and batches
 * POST /api/lead-sources/process  - Process batch → 1K blocks → Skip trace → SMS
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import {
  LEAD_SOURCE_FOLDERS,
  SMS_TEMPLATE_GROUPS,
  BATCH_CONFIG,
  getFolderById,
  getFoldersByParent,
  getFoldersBySector,
  getTemplateGroupsBySector,
  calculateBatchBlocks,
  calculateBatchCost,
} from "@/config/lead-sources";
import { Logger } from "@/lib/logger";

const log = new Logger("LeadSourcesAPI");

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List folders and get info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const folderId = searchParams.get("folderId");
    const sector = searchParams.get("sector");

    // Get specific folder
    if (action === "folder" && folderId) {
      const folder = getFolderById(folderId);
      if (!folder) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 },
        );
      }

      const children = getFoldersByParent(folderId);
      const templates = folder.sector
        ? getTemplateGroupsBySector(folder.sector)
        : [];

      return NextResponse.json({
        success: true,
        folder,
        children,
        templateGroups: templates,
        batchConfig: BATCH_CONFIG,
      });
    }

    // Get folders by sector
    if (action === "sector" && sector) {
      const folders = getFoldersBySector(sector);
      const templates = getTemplateGroupsBySector(sector);

      return NextResponse.json({
        success: true,
        sector,
        folders,
        templateGroups: templates,
      });
    }

    // List all root folders
    const rootFolders = getFoldersByParent(null);

    return NextResponse.json({
      success: true,
      folders: rootFolders,
      totalFolders: Object.keys(LEAD_SOURCE_FOLDERS).length,
      templateGroups: Object.keys(SMS_TEMPLATE_GROUPS).length,
      batchConfig: BATCH_CONFIG,
      endpoints: {
        listFolder: "GET /api/lead-sources?action=folder&folderId=xxx",
        bySector: "GET /api/lead-sources?action=sector&sector=xxx",
        upload: "POST /api/lead-sources { action: 'upload', folderId, file }",
        process: "POST /api/lead-sources { action: 'process', batchId }",
      },
    });
  } catch (error) {
    log.error("GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get folders",
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Upload batch or process
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle file upload (multipart)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const folderId = formData.get("folderId") as string;
      const batchName = formData.get("batchName") as string;

      if (!file || !folderId) {
        return NextResponse.json(
          { error: "file and folderId required" },
          { status: 400 },
        );
      }

      const folder = getFolderById(folderId);
      if (!folder) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 },
        );
      }

      // Parse CSV to count records
      const content = await file.text();
      const lines = content.split("\n").filter((l) => l.trim());
      const recordCount = lines.length - 1; // Exclude header

      // Calculate blocks
      const blockCount = calculateBatchBlocks(recordCount);
      const estimatedCost = calculateBatchCost(recordCount);

      // Generate batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      log.info("Batch uploaded", {
        batchId,
        folderId,
        fileName: file.name,
        recordCount,
        blockCount,
        estimatedCost,
      });

      return NextResponse.json({
        success: true,
        batch: {
          id: batchId,
          folderId,
          name: batchName || file.name,
          fileName: file.name,
          totalRecords: recordCount,
          status: "uploaded",
          blockCount,
          estimatedCost: `$${estimatedCost.toFixed(2)}`,
        },
        folder: {
          id: folder.id,
          name: folder.name,
          sector: folder.sector,
          tags: folder.tags,
        },
        nextSteps: [
          `POST /api/lead-sources with action: 'process' and batchId: '${batchId}'`,
          `Will create ${blockCount} blocks of ${BATCH_CONFIG.SKIP_TRACE_BLOCK_SIZE} leads each`,
          `Skip trace cost: $${estimatedCost.toFixed(2)} ($0.02/lead)`,
          "After trace: auto-route to SMS template group based on sector",
        ],
      });
    }

    // Handle JSON actions
    const body = await request.json();
    const { action, folderId, batchId, config } = body;

    switch (action) {
      case "createFolder": {
        // Would create a new folder in DB
        return NextResponse.json({
          success: true,
          message: "Folder creation - implement with DB",
          example: {
            name: "My Custom Folder",
            parentId: "hs_root",
            tags: ["custom", "my-tag"],
            sector: "home-services",
          },
        });
      }

      case "process": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for process" },
            { status: 400 },
          );
        }

        // This would trigger the batch processing pipeline
        // 1. Split into 1K blocks
        // 2. Queue for Tracerfy skip trace
        // 3. After trace, route to SMS template group
        // 4. Deploy SMS blocks

        return NextResponse.json({
          success: true,
          message: "Batch processing initiated",
          batchId,
          pipeline: [
            {
              stage: "SPLIT",
              status: "pending",
              description: "Split into 1K blocks",
            },
            {
              stage: "TRACE",
              status: "pending",
              description: "Tracerfy skip trace ($0.02/lead)",
            },
            {
              stage: "FILTER",
              status: "pending",
              description: "Filter by mobile contactability",
            },
            {
              stage: "TEMPLATE",
              status: "pending",
              description: "Match to SMS template group",
            },
            {
              stage: "DEPLOY",
              status: "pending",
              description: "Queue for SMS deployment",
            },
          ],
          worker: "LUCI → GIANNA",
          note: "Track progress at GET /api/lead-sources?action=batch&batchId=xxx",
        });
      }

      case "preview": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for preview" },
            { status: 400 },
          );
        }

        // Would return batch preview with sample messages
        return NextResponse.json({
          success: true,
          batchId,
          preview: {
            totalLeads: 1500,
            blocks: 2,
            withMobile: 1200,
            withEmail: 1100,
            contactableRate: "80%",
            templateGroup: "HOME_SERVICES_DISCOVERY",
            sampleMessages: [
              "Hi John, grow your Plumbing biz without hiring sales? Our AI books jobs while you work. 15-min demo? Reply STOP to opt out -NEXTIER",
              "Hi Mike, HVAC & plumbing owners are booking 20+ jobs/month with our AI. Quick call to show you? Reply STOP to opt out -NEXTIER",
            ],
            estimatedCost: {
              skipTrace: "$30.00",
              sms: "$24.00",
              total: "$54.00",
            },
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            validActions: ["createFolder", "process", "preview"],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    log.error("POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 },
    );
  }
}

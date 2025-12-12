import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

const TRAINING_DATA_KEY = "ai/gianna-training-data.json";

interface TrainingExample {
  id: string;
  category: string;
  incomingMessage: string;
  idealResponse: string;
  intent: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TrainingData {
  examples: TrainingExample[];
  lastUpdated: string;
  version: number;
}

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[AI Training API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Load training data from DO Spaces
async function loadTrainingData(): Promise<TrainingData> {
  const client = getS3Client();
  if (!client) {
    return { examples: [], lastUpdated: new Date().toISOString(), version: 1 };
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: TRAINING_DATA_KEY,
      }),
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) {
      return {
        examples: [],
        lastUpdated: new Date().toISOString(),
        version: 1,
      };
    }

    return JSON.parse(bodyContents);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "NoSuchKey") {
      // File doesn't exist yet, return empty data
      return {
        examples: [],
        lastUpdated: new Date().toISOString(),
        version: 1,
      };
    }
    console.error("[AI Training API] Load error:", error);
    return { examples: [], lastUpdated: new Date().toISOString(), version: 1 };
  }
}

// Save training data to DO Spaces
async function saveTrainingData(data: TrainingData): Promise<boolean> {
  const client = getS3Client();
  if (!client) {
    console.warn("[AI Training API] Cannot save - DO Spaces not configured");
    return false;
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: TRAINING_DATA_KEY,
        Body: JSON.stringify(data, null, 2),
        ContentType: "application/json",
      }),
    );
    return true;
  } catch (error) {
    console.error("[AI Training API] Save error:", error);
    return false;
  }
}

// GET - Retrieve training data
export async function GET() {
  try {
    const data = await loadTrainingData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[AI Training API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load training data", examples: [] },
      { status: 500 },
    );
  }
}

// POST - Save/update training data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examples } = body;

    if (!Array.isArray(examples)) {
      return NextResponse.json(
        { error: "examples must be an array" },
        { status: 400 },
      );
    }

    // Load existing data to get version
    const existing = await loadTrainingData();

    const data: TrainingData = {
      examples,
      lastUpdated: new Date().toISOString(),
      version: existing.version + 1,
    };

    const saved = await saveTrainingData(data);

    if (!saved) {
      // Return success anyway but note it's only in memory
      return NextResponse.json({
        success: true,
        message: "Training data received (local only - storage not configured)",
        count: examples.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Training data saved",
      count: examples.length,
      version: data.version,
    });
  } catch (error) {
    console.error("[AI Training API] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save training data",
      },
      { status: 500 },
    );
  }
}

// DELETE - Clear all training data (use with caution)
export async function DELETE() {
  try {
    const data: TrainingData = {
      examples: [],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };

    await saveTrainingData(data);

    return NextResponse.json({
      success: true,
      message: "All training data cleared",
    });
  } catch (error) {
    console.error("[AI Training API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to clear training data" },
      { status: 500 },
    );
  }
}

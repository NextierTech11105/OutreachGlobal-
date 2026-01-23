import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint - shows which DO Spaces env vars are configured
 */
export async function GET(request: NextRequest) {
  const envCheck = {
    // Spaces bucket
    SPACES_BUCKET: !!process.env.SPACES_BUCKET,
    DO_SPACES_BUCKET: !!process.env.DO_SPACES_BUCKET,
    DIGITALOCEAN_SPACES_BUCKET: !!process.env.DIGITALOCEAN_SPACES_BUCKET,
    BUCKET_NAME: !!process.env.BUCKET_NAME,

    // Access key
    SPACES_KEY: !!process.env.SPACES_KEY,
    DO_SPACES_KEY: !!process.env.DO_SPACES_KEY,
    DIGITALOCEAN_SPACES_KEY: !!process.env.DIGITALOCEAN_SPACES_KEY,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    S3_ACCESS_KEY: !!process.env.S3_ACCESS_KEY,

    // Secret key
    SPACES_SECRET: !!process.env.SPACES_SECRET,
    DO_SPACES_SECRET: !!process.env.DO_SPACES_SECRET,
    DIGITALOCEAN_SPACES_SECRET: !!process.env.DIGITALOCEAN_SPACES_SECRET,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    S3_SECRET_KEY: !!process.env.S3_SECRET_KEY,

    // What the code is actually using
    resolved: {
      bucket:
        process.env.SPACES_BUCKET ||
        process.env.DO_SPACES_BUCKET ||
        process.env.DIGITALOCEAN_SPACES_BUCKET ||
        process.env.BUCKET_NAME ||
        "nextier (default)",
      hasKey: !!(
        process.env.SPACES_KEY ||
        process.env.DO_SPACES_KEY ||
        process.env.DIGITALOCEAN_SPACES_KEY ||
        process.env.AWS_ACCESS_KEY_ID ||
        process.env.S3_ACCESS_KEY
      ),
      hasSecret: !!(
        process.env.SPACES_SECRET ||
        process.env.DO_SPACES_SECRET ||
        process.env.DIGITALOCEAN_SPACES_SECRET ||
        process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.S3_SECRET_KEY
      ),
    },

    // All env var keys (not values, just names)
    allEnvKeys: Object.keys(process.env).filter(
      (k) =>
        k.includes("SPACE") ||
        k.includes("BUCKET") ||
        k.includes("AWS") ||
        k.includes("S3") ||
        k.includes("DO_"),
    ),
  };

  return NextResponse.json(envCheck);
}

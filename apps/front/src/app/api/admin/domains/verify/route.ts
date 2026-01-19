import { NextRequest, NextResponse } from "next/server";

// DNS record types for Google DNS API
type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA";

interface DnsRecord {
  type: DnsRecordType;
  name: string;
  value: string;
  purpose?: string;
}

interface GoogleDnsResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{
    name: string;
    type: number;
  }>;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
}

// Map record type to Google DNS type number
const DNS_TYPE_MAP: Record<DnsRecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  NS: 2,
  SOA: 6,
};

// Verify a single DNS record using Google DNS-over-HTTPS
async function verifyDnsRecord(
  domain: string,
  recordType: DnsRecordType,
  expectedValue: string
): Promise<{ verified: boolean; actualValue?: string; error?: string }> {
  try {
    // Construct the full domain name for the query
    let queryDomain = domain;

    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(queryDomain)}&type=${recordType}`,
      {
        headers: {
          Accept: "application/dns-json",
        },
      }
    );

    if (!response.ok) {
      return { verified: false, error: `DNS query failed: ${response.status}` };
    }

    const data: GoogleDnsResponse = await response.json();

    // No answer means record doesn't exist
    if (!data.Answer || data.Answer.length === 0) {
      return { verified: false, error: "No DNS record found" };
    }

    // Check if any answer matches the expected value
    const answers = data.Answer.filter(
      (a) => a.type === DNS_TYPE_MAP[recordType]
    );

    // For CNAME, the target might have a trailing dot
    const normalizedExpected = expectedValue.toLowerCase().replace(/\.$/, "");

    for (const answer of answers) {
      const normalizedActual = answer.data.toLowerCase().replace(/\.$/, "").replace(/^"/, "").replace(/"$/, "");

      // Check for exact match or partial match (for TXT records which can be split)
      if (
        normalizedActual === normalizedExpected ||
        normalizedActual.includes(normalizedExpected) ||
        normalizedExpected.includes(normalizedActual)
      ) {
        return { verified: true, actualValue: answer.data };
      }
    }

    // Return the actual value found even if it doesn't match
    return {
      verified: false,
      actualValue: answers[0]?.data,
      error: "Value doesn't match expected",
    };
  } catch (error) {
    console.error("DNS verification error:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Build the full domain name for DNS query
function buildQueryDomain(baseDomain: string, recordName: string): string {
  if (recordName === "@") {
    return baseDomain;
  }
  // If the name already includes the domain, return as-is
  if (recordName.endsWith(baseDomain)) {
    return recordName;
  }
  return `${recordName}.${baseDomain}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, records } = body as {
      domain: string;
      records: DnsRecord[];
    };

    if (!domain || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid request: domain and records required" },
        { status: 400 }
      );
    }

    // Extract base domain (remove subdomain if present)
    const domainParts = domain.split(".");
    const baseDomain =
      domainParts.length > 2
        ? domainParts.slice(-2).join(".")
        : domain;

    // Verify each record
    const results = await Promise.all(
      records.map(async (record) => {
        // Skip records with placeholder values
        if (
          record.value.includes("(") ||
          record.value.includes("your") ||
          record.value.includes("Get from")
        ) {
          return {
            type: record.type,
            name: record.name,
            verified: false,
            error: "Placeholder value - needs configuration",
          };
        }

        const queryDomain = buildQueryDomain(baseDomain, record.name);
        const result = await verifyDnsRecord(
          queryDomain,
          record.type as DnsRecordType,
          record.value
        );

        return {
          type: record.type,
          name: record.name,
          queryDomain,
          ...result,
        };
      })
    );

    // Check if all records are verified
    const allVerified = results.every((r) => r.verified);

    return NextResponse.json({
      domain,
      baseDomain,
      allVerified,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DNS verification API error:", error);
    return NextResponse.json(
      {
        error: "Verification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick domain check
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const domain = searchParams.get("domain");
  const type = (searchParams.get("type") || "A") as DnsRecordType;

  if (!domain) {
    return NextResponse.json(
      { error: "Domain parameter required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
      {
        headers: {
          Accept: "application/dns-json",
        },
      }
    );

    const data: GoogleDnsResponse = await response.json();

    return NextResponse.json({
      domain,
      type,
      status: data.Status === 0 ? "OK" : "ERROR",
      records: data.Answer?.map((a) => ({
        name: a.name,
        type: a.type,
        ttl: a.TTL,
        value: a.data,
      })) || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DNS lookup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

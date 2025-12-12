import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || "Property Valuation";
  const value = searchParams.get("value") || "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          backgroundImage:
            "linear-gradient(135deg, #1e3a8a 0%, #0f172a 50%, #1e1b4b 100%)",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "30px 50px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
                <polyline
                  points="9 22 9 12 15 12 15 22"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <span
              style={{ color: "white", fontSize: "24px", fontWeight: "bold" }}
            >
              NexTier
            </span>
          </div>
          <span
            style={{ color: "#94a3b8", fontSize: "18px", marginLeft: "auto" }}
          >
            Property Valuation Report
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 50px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span style={{ color: "#94a3b8", fontSize: "18px" }}>
              {address.length > 60 ? address.substring(0, 60) + "..." : address}
            </span>
          </div>

          {value && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <span style={{ color: "#64748b", fontSize: "20px" }}>
                Estimated Value
              </span>
              <span
                style={{
                  color: "#4ade80",
                  fontSize: "72px",
                  fontWeight: "bold",
                  letterSpacing: "-2px",
                }}
              >
                {value}
              </span>
            </div>
          )}

          {!value && (
            <span
              style={{
                color: "white",
                fontSize: "48px",
                fontWeight: "bold",
              }}
            >
              Free Property Valuation
            </span>
          )}

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6">
                <polyline
                  points="22 12 18 12 15 21 9 3 6 12 2 12"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
              <span style={{ color: "#60a5fa", fontSize: "14px" }}>
                Market Analysis
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "rgba(139, 92, 246, 0.2)",
                borderRadius: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#8b5cf6">
                <path
                  d="M3 3v18h18"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  fill="none"
                />
                <path d="M18 17V9" stroke="#8b5cf6" strokeWidth="2" />
                <path d="M13 17V5" stroke="#8b5cf6" strokeWidth="2" />
                <path d="M8 17v-3" stroke="#8b5cf6" strokeWidth="2" />
              </svg>
              <span style={{ color: "#a78bfa", fontSize: "14px" }}>
                Comparables
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                borderRadius: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
              <span style={{ color: "#34d399", fontSize: "14px" }}>
                AI Insights
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 50px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ color: "#64748b", fontSize: "14px" }}>
            Tap to view your full report
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              borderRadius: "8px",
            }}
          >
            <span
              style={{ color: "white", fontSize: "14px", fontWeight: "600" }}
            >
              View Report
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

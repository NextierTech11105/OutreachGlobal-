"use client";

import { useState } from "react";

/**
 * TEST SMS PAGE - Prove SMS actually works
 */

export default function TestSMSPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Test message from NEXTIER");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/sms/send");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError("Failed to check status: " + String(err));
    }
  };

  const sendTestSMS = async () => {
    if (!phone) {
      setError("Enter a phone number");
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: message,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "SMS send failed");
        setResult(data);
      }
    } catch (err) {
      setError("Network error: " + String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "system-ui" }}>
      <h1>Test SMS - PROVE IT WORKS</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Send a real SMS to verify SignalHouse is working.
      </p>

      {/* Status Check */}
      <div style={{ marginBottom: "30px", padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
        <button
          onClick={checkStatus}
          style={{
            padding: "10px 20px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Check SMS Config Status
        </button>
        {status && (
          <pre style={{ marginTop: "10px", fontSize: "12px", background: "#fff", padding: "10px", borderRadius: "4px", overflow: "auto" }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        )}
      </div>

      {/* Send SMS Form */}
      <div style={{ marginBottom: "30px", padding: "20px", border: "2px solid #ccc", borderRadius: "8px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Phone Number (with country code):
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Message:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          onClick={sendTestSMS}
          disabled={sending || !phone}
          style={{
            width: "100%",
            padding: "15px",
            background: sending ? "#999" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: sending ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {sending ? "SENDING..." : "SEND TEST SMS"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "15px", background: "#fee", color: "#c00", borderRadius: "8px", marginBottom: "20px" }}>
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ padding: "20px", background: result.success ? "#efe" : "#fee", borderRadius: "8px" }}>
          <h2 style={{ color: result.success ? "#070" : "#c00" }}>
            {result.success ? "SMS SENT!" : "SMS FAILED"}
          </h2>
          <pre style={{ marginTop: "10px", fontSize: "12px", background: "#fff", padding: "10px", borderRadius: "4px", overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>What This Tests</h2>
      <ul style={{ lineHeight: "1.8" }}>
        <li>SignalHouse API credentials are correct</li>
        <li>SMS sending actually works</li>
        <li>Phone number formatting is correct</li>
        <li>Message gets delivered</li>
      </ul>

      <h2>If This Works</h2>
      <p>Then SignalHouse is configured correctly and SMS sending is functional.</p>

      <h2>If This Fails</h2>
      <p>Check the error message for details about what went wrong.</p>
    </div>
  );
}

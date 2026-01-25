"use client";

import { useState } from "react";

export default function TestSendPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Test from Nextier");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendSMS = async () => {
    if (!phone) {
      setResult("Enter a phone number");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult("Error: " + (e instanceof Error ? e.message : "Failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>SMS Test Page</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4 }}>Phone Number:</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+15551234567"
          style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4 }}>Message:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ccc" }}
        />
      </div>

      <button
        onClick={sendSMS}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          background: loading ? "#999" : "#0070f3",
          color: "white",
          border: "none",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Sending..." : "Send SMS"}
      </button>

      {result && (
        <pre style={{ marginTop: 20, padding: 16, background: "#f5f5f5", overflow: "auto", fontSize: 12 }}>
          {result}
        </pre>
      )}
    </div>
  );
}

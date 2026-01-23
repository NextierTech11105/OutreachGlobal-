"use client";

import { useState } from "react";

/**
 * SIMPLE TEST UPLOAD PAGE
 * No fancy UI, no auth, just proves uploads work.
 */

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  // Check DO Spaces status on load
  const checkStatus = async () => {
    try {
      const res = await fetch("/api/test-upload");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError("Failed to check status: " + String(err));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError("Network error: " + String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: "20px" }}>Test Upload - NO AUTH</h1>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        This page proves DO Spaces uploads work. No login required.
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
            marginBottom: "10px",
          }}
        >
          Check DO Spaces Status
        </button>
        {status && (
          <pre style={{ marginTop: "10px", fontSize: "12px", overflow: "auto", background: "#fff", padding: "10px", borderRadius: "4px" }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        )}
      </div>

      {/* Upload Form */}
      <div style={{ marginBottom: "30px", padding: "20px", border: "2px dashed #ccc", borderRadius: "8px" }}>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: "15px", display: "block" }}
        />

        {file && (
          <p style={{ marginBottom: "15px" }}>
            Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            padding: "12px 30px",
            background: uploading ? "#999" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {uploading ? "UPLOADING..." : "UPLOAD FILE"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "15px", background: "#fee", color: "#c00", borderRadius: "8px", marginBottom: "20px" }}>
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div style={{ padding: "20px", background: "#efe", borderRadius: "8px" }}>
          <h2 style={{ color: "#070", marginBottom: "10px" }}>SUCCESS!</h2>
          <p><strong>File uploaded to DO Spaces</strong></p>
          <p style={{ marginTop: "10px" }}>
            <a
              href={result.file?.publicUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#0070f3" }}
            >
              View Uploaded File
            </a>
          </p>
          <pre style={{ marginTop: "15px", fontSize: "12px", overflow: "auto", background: "#fff", padding: "10px", borderRadius: "4px" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #eee" }} />

      <h2>What This Proves</h2>
      <ul style={{ lineHeight: "1.8" }}>
        <li>DO Spaces credentials are configured correctly</li>
        <li>File uploads to cloud storage work</li>
        <li>The Next.js API routes work</li>
        <li>Files become publicly accessible via CDN</li>
      </ul>

      <h2 style={{ marginTop: "30px" }}>If This Works</h2>
      <p>Then the problem is in the complex import flow, not the basic infrastructure.</p>
      <p>Next step: Go to <code>/t/YOUR_TEAM_ID/import</code> and try uploading there.</p>
    </div>
  );
}

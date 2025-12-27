export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#09090b",
        color: "#fafafa",
      }}
    >
      <h1 style={{ fontSize: "6rem", fontWeight: "bold", color: "#3f3f46" }}>
        404
      </h1>
      <p style={{ color: "#71717a", marginBottom: "2rem" }}>Page not found</p>
      <a href="/" style={{ color: "#3b82f6", textDecoration: "none" }}>
        Go home
      </a>
    </div>
  );
}

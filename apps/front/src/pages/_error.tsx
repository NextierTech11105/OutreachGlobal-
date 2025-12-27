import { NextPageContext } from "next";

interface ErrorProps {
  statusCode: number | undefined;
}

function Error({ statusCode }: ErrorProps) {
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
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          fontWeight: "bold",
          color: "#3f3f46",
          margin: 0,
        }}
      >
        {statusCode || "Error"}
      </h1>
      <p style={{ color: "#71717a", marginTop: "1rem" }}>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : "An error occurred on client"}
      </p>
      <a
        href="/"
        style={{ color: "#3b82f6", marginTop: "2rem", textDecoration: "none" }}
      >
        Go home
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;

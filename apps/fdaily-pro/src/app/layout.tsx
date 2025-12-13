import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FDAILY Pro - Foreclosure Lead Workflow",
  description: "Import, Enrich, Export foreclosure leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#0a0a0a',
        color: '#fafafa',
        minHeight: '100vh'
      }}>
        {children}
      </body>
    </html>
  );
}

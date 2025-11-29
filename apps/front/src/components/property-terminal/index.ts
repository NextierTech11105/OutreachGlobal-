"use client";

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled to prevent client-side errors during server rendering
// PropertyTerminal uses sessionStorage, crypto.randomUUID, and PropertyMap (which uses google.maps)
export const PropertyTerminal = dynamic(
  () => import("./property-terminal").then((mod) => mod.PropertyTerminal),
  { ssr: false }
);

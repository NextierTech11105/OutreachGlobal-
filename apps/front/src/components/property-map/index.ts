import dynamic from "next/dynamic";

// Dynamic import with SSR disabled to prevent google.maps errors during server-side rendering
export const PropertyMap = dynamic(
  () => import("./property-map").then((mod) => mod.PropertyMap),
  { ssr: false }
);

export type { PropertyMarker } from "./property-map";

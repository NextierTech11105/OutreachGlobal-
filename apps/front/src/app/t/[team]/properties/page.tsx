import { getTitle } from "@/config/title";
import { PropertyTerminal } from "@/components/property-terminal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Property Terminal"),
};

export default function PropertiesPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <PropertyTerminal />
    </div>
  );
}

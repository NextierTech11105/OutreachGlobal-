import { NextResponse } from "next/server";

export async function GET() {
  // Return AI SDR avatars
  return NextResponse.json({
    avatars: [
      {
        id: "gianna",
        name: "GIANNA",
        role: "Opener",
        description: "Initial outreach specialist",
        avatar: "/avatars/gianna.png",
      },
      {
        id: "cathy",
        name: "CATHY",
        role: "Nudger",
        description: "Follow-up and retargeting specialist",
        avatar: "/avatars/cathy.png",
      },
      {
        id: "sabrina",
        name: "SABRINA",
        role: "Closer",
        description: "Appointment confirmation specialist",
        avatar: "/avatars/sabrina.png",
      },
    ],
  });
}

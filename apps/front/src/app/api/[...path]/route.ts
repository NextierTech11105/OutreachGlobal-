import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  
  try {
    const response = await fetch(`${API_URL}/rest/${path}${request.nextUrl.search}`, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
        "X-Team-ID": request.headers.get("X-Team-ID") || "",
      },
      credentials: "include",
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for /api/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const body = await request.json();
  
  try {
    const response = await fetch(`${API_URL}/rest/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") || "",
        "X-Team-ID": request.headers.get("X-Team-ID") || "",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for /api/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const body = await request.json();
  
  try {
    const response = await fetch(`${API_URL}/rest/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") || "",
        "X-Team-ID": request.headers.get("X-Team-ID") || "",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for /api/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  
  try {
    const response = await fetch(`${API_URL}/rest/${path}${request.nextUrl.search}`, {
      method: "DELETE",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
        "X-Team-ID": request.headers.get("X-Team-ID") || "",
      },
      credentials: "include",
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for /api/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

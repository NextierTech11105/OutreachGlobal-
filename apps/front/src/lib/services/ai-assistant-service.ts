// AI Assistant Service
// This service handles the AI assistant functionality for the call center
// NOW CONNECTED TO REAL CONTENT LIBRARY API

export type AIAssistantCategory = "scripts" | "objections" | "keyPoints";

export interface AIAssistantItem {
  id: string;
  title: string;
  content: string;
  category: AIAssistantCategory;
  tags: string[];
  updatedAt: string;
}

interface CreateAIAssistantItemInput {
  title: string;
  content: string;
  category: AIAssistantCategory;
  tags: string[];
}

// Map content library categories to AI assistant categories
const CATEGORY_SLUG_MAP: Record<AIAssistantCategory, string[]> = {
  scripts: ["voice-scripts", "cold-calling", "follow-up-calls", "voicemail"],
  objections: ["objection-handling", "sales-objections"],
  keyPoints: ["key-points", "value-propositions", "selling-points"],
};

// Get AI assistant items from Content Library API
export async function getAIAssistantItems(
  category?: AIAssistantCategory,
): Promise<AIAssistantItem[]> {
  try {
    // Fetch from GraphQL API via Next.js API route
    const response = await fetch("/api/content-library/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: category ? CATEGORY_SLUG_MAP[category] : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch content items");
    }

    const data = await response.json();
    
    // Transform content items to AI assistant format
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      content: item.content || item.body,
      category: mapToAICategory(item.categorySlug),
      tags: item.tags || [],
      updatedAt: item.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching AI assistant items:", error);
    return [];
  }
}

// Helper to map content library slugs back to AI categories
function mapToAICategory(slug: string): AIAssistantCategory {
  if (CATEGORY_SLUG_MAP.scripts.includes(slug)) return "scripts";
  if (CATEGORY_SLUG_MAP.objections.includes(slug)) return "objections";
  if (CATEGORY_SLUG_MAP.keyPoints.includes(slug)) return "keyPoints";
  return "scripts"; // default
}

// Create a new AI assistant item via Content Library API
export async function createAIAssistantItem(
  input: CreateAIAssistantItemInput,
): Promise<AIAssistantItem> {
  const response = await fetch("/api/content-library/items", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      categorySlug: CATEGORY_SLUG_MAP[input.category][0],
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create content item");
  }

  const data = await response.json();
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: input.category,
    tags: data.tags || input.tags,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

// Update an existing AI assistant item
export async function updateAIAssistantItem(
  id: string,
  input: CreateAIAssistantItemInput,
): Promise<AIAssistantItem> {
  const response = await fetch(`/api/content-library/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update content item");
  }

  const data = await response.json();
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: input.category,
    tags: data.tags || input.tags,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

// Delete an AI assistant item
export async function deleteAIAssistantItem(id: string): Promise<void> {
  const response = await fetch(`/api/content-library/items/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete content item");
  }
}

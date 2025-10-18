import { characterBots } from "../db/schema-extensions";
import { db } from "../db";
import { eq } from "drizzle-orm";

export interface AiSdrFaq {
  question: string;
  answer: string;
  category?: string;
}

export interface AiSdrData {
  id?: number;
  name: string;
  description: string;
  personality: string;
  voiceType: string;
  avatarUrl: string;
  isActive: boolean;
  industry: string;
  mission: string;
  goal: string;
  role: string[];
  faqs: AiSdrFaq[];
  tags: string[];
}

export async function getAllAiSdrs() {
  try {
    const bots = await db.select().from(characterBots);

    return bots.map((bot) => {
      const parsedData = {
        ...bot,
        role: JSON.parse(bot.personality).role || [],
        faqs: JSON.parse(bot.personality).faqs || [],
        tags: JSON.parse(bot.personality).tags || [],
        mission: JSON.parse(bot.personality).mission || "",
        goal: JSON.parse(bot.personality).goal || "",
        industry: JSON.parse(bot.personality).industry || "",
        personality: JSON.parse(bot.personality).traits || bot.personality,
      };

      return parsedData;
    });
  } catch (error) {
    console.error("Error fetching AI SDRs:", error);
    throw new Error("Failed to fetch AI SDRs");
  }
}

export async function getAiSdrById(id: number) {
  try {
    const bot = await db
      .select()
      .from(characterBots)
      .where(eq(characterBots.id, id))
      .limit(1);

    if (!bot.length) {
      throw new Error("AI SDR not found");
    }

    const parsedData = {
      ...bot[0],
      role: JSON.parse(bot[0].personality).role || [],
      faqs: JSON.parse(bot[0].personality).faqs || [],
      tags: JSON.parse(bot[0].personality).tags || [],
      mission: JSON.parse(bot[0].personality).mission || "",
      goal: JSON.parse(bot[0].personality).goal || "",
      industry: JSON.parse(bot[0].personality).industry || "",
      personality: JSON.parse(bot[0].personality).traits || bot[0].personality,
    };

    return parsedData;
  } catch (error) {
    console.error(`Error fetching AI SDR with ID ${id}:`, error);
    throw new Error("Failed to fetch AI SDR");
  }
}

export async function createAiSdr(data: Omit<AiSdrData, "id">) {
  try {
    // Prepare the personality JSON
    const personalityData = {
      traits: data.personality,
      role: data.role,
      faqs: data.faqs,
      tags: data.tags,
      mission: data.mission,
      goal: data.goal,
      industry: data.industry,
    };

    const result = await db.insert(characterBots).values({
      name: data.name,
      description: data.description,
      personality: JSON.stringify(personalityData),
      voiceType: data.voiceType,
      avatarUrl: data.avatarUrl,
      isActive: data.isActive,
    });

    return result;
  } catch (error) {
    console.error("Error creating AI SDR:", error);
    throw new Error("Failed to create AI SDR");
  }
}

export async function updateAiSdr(id: number, data: Omit<AiSdrData, "id">) {
  try {
    // Prepare the personality JSON
    const personalityData = {
      traits: data.personality,
      role: data.role,
      faqs: data.faqs,
      tags: data.tags,
      mission: data.mission,
      goal: data.goal,
      industry: data.industry,
    };

    const result = await db
      .update(characterBots)
      .set({
        name: data.name,
        description: data.description,
        personality: JSON.stringify(personalityData),
        voiceType: data.voiceType,
        avatarUrl: data.avatarUrl,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(characterBots.id, id));

    return result;
  } catch (error) {
    console.error(`Error updating AI SDR with ID ${id}:`, error);
    throw new Error("Failed to update AI SDR");
  }
}

export async function deleteAiSdr(id: number) {
  try {
    const result = await db
      .delete(characterBots)
      .where(eq(characterBots.id, id));
    return result;
  } catch (error) {
    console.error(`Error deleting AI SDR with ID ${id}:`, error);
    throw new Error("Failed to delete AI SDR");
  }
}

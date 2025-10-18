// AI Assistant Service
// This service handles the AI assistant functionality for the call center

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

// Mock data for development
const mockItems: AIAssistantItem[] = [
  {
    id: "script-1",
    title: "Initial Greeting",
    content:
      "Hello, my name is [Agent Name] from Nextier Data Engine. I'm calling about your property at [Address]. We've noticed some interesting data points about your property that I thought might be valuable to discuss. Do you have a moment to chat?",
    category: "scripts",
    tags: ["greeting", "introduction", "cold-call"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "script-2",
    title: "Value Proposition",
    content:
      "Our platform specializes in analyzing real estate data to identify properties with high potential value. Based on our analysis, your property at [Address] shows several indicators that make it stand out in the current market. I'd like to share some specific insights that could help you make more informed decisions about your property.",
    category: "scripts",
    tags: ["value-prop", "benefits", "data-insights"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "script-3",
    title: "Meeting Request",
    content:
      "I'd like to schedule a brief 15-minute meeting to walk you through our findings in more detail. We can do this via phone or video call, whichever you prefer. Would you be available sometime this week, perhaps Tuesday or Thursday afternoon?",
    category: "scripts",
    tags: ["meeting", "scheduling", "follow-up"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "objection-1",
    title: "Not Interested",
    content:
      "I understand you're not interested right now. Many property owners initially feel the same way until they see the specific data insights we've uncovered about their property. Would you be open to receiving a one-page summary of our findings by email? This way you can review it at your convenience with no obligation.",
    category: "objections",
    tags: ["not-interested", "email-offer", "soft-close"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "objection-2",
    title: "Already Working with Someone",
    content:
      "I appreciate that you're already working with someone. Our service is actually complementary to what most real estate professionals offer. We provide data-driven insights that can enhance the work you're doing with your current partner. Would it be valuable to have an additional perspective based purely on market data analysis?",
    category: "objections",
    tags: ["competition", "complementary-service", "value-add"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "objection-3",
    title: "Bad Timing",
    content:
      "I understand timing is important. When would be a better time to reconnect? The real estate market is constantly changing, and our data insights are most valuable when they're current. I'd be happy to schedule a follow-up call at a time that works better for you.",
    category: "objections",
    tags: ["timing", "follow-up", "scheduling"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "keypoint-1",
    title: "Property Value Trends",
    content:
      "Your property is located in an area where values have increased by an average of 12% over the past 18 months, compared to the city average of 8%. This is driven by three key factors: improved school ratings, new commercial development within 1 mile, and decreased inventory of similar properties.",
    category: "keyPoints",
    tags: ["value", "trends", "market-data"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "keypoint-2",
    title: "Zoning Opportunities",
    content:
      "Your property's current R6 zoning allows for potential development opportunities that many owners aren't aware of. Recent changes to local ordinances now permit accessory dwelling units and increased height allowances that could significantly impact property utilization and value.",
    category: "keyPoints",
    tags: ["zoning", "development", "regulations"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "keypoint-3",
    title: "Comparable Sales",
    content:
      "Three properties within 0.5 miles of your location have sold in the past 60 days for an average of $325 per square foot. These properties had similar characteristics to yours but lacked the corner lot advantage and southern exposure that your property offers.",
    category: "keyPoints",
    tags: ["comps", "sales-data", "valuation"],
    updatedAt: new Date().toISOString(),
  },
];

// Get AI assistant items
export async function getAIAssistantItems(
  category?: AIAssistantCategory,
): Promise<AIAssistantItem[]> {
  // In a real implementation, this would fetch from an API
  return new Promise((resolve) => {
    setTimeout(() => {
      if (category) {
        resolve(mockItems.filter((item) => item.category === category));
      } else {
        resolve(mockItems);
      }
    }, 500);
  });
}

// Create a new AI assistant item
export async function createAIAssistantItem(
  input: CreateAIAssistantItemInput,
): Promise<AIAssistantItem> {
  // In a real implementation, this would call an API
  return new Promise((resolve) => {
    setTimeout(() => {
      const newItem: AIAssistantItem = {
        id: `item-${Date.now()}`,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      mockItems.push(newItem);
      resolve(newItem);
    }, 500);
  });
}

// Update an existing AI assistant item
export async function updateAIAssistantItem(
  id: string,
  input: CreateAIAssistantItemInput,
): Promise<AIAssistantItem> {
  // In a real implementation, this would call an API
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockItems.findIndex((item) => item.id === id);
      if (index === -1) {
        reject(new Error("Item not found"));
        return;
      }

      const updatedItem: AIAssistantItem = {
        ...mockItems[index],
        ...input,
        updatedAt: new Date().toISOString(),
      };

      mockItems[index] = updatedItem;
      resolve(updatedItem);
    }, 500);
  });
}

// Delete an AI assistant item
export async function deleteAIAssistantItem(id: string): Promise<void> {
  // In a real implementation, this would call an API
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockItems.findIndex((item) => item.id === id);
      if (index === -1) {
        reject(new Error("Item not found"));
        return;
      }

      mockItems.splice(index, 1);
      resolve();
    }, 500);
  });
}

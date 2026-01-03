/**
 * Cold SMS Variance Engine - Scheduling System
 *
 * Controls when messages are sent based on:
 * - Day of week preferences
 * - Time band optimization
 * - Industry-specific timing
 * - Rate limiting and pacing
 *
 * @see docs/COLD_SMS_VARIANCE_ENGINE.md
 */

import { LeadContext } from "./variance-rules";

/**
 * Time band definitions
 * Based on research on optimal cold outreach timing
 */
export type TimeBand =
  | "early_morning" // 7:00 - 9:00
  | "mid_morning" // 9:00 - 11:00
  | "late_morning" // 11:00 - 12:00
  | "lunch" // 12:00 - 13:30
  | "early_afternoon" // 13:30 - 15:00
  | "mid_afternoon" // 15:00 - 17:00
  | "late_afternoon" // 17:00 - 18:30
  | "evening"; // 18:30 - 20:00

export interface TimeBandConfig {
  band: TimeBand;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  weight: number; // Higher = more messages in this band
  description: string;
}

/**
 * Time band configurations with optimal weights
 * Weights based on business SMS response rate research
 */
export const TIME_BANDS: TimeBandConfig[] = [
  {
    band: "early_morning",
    startHour: 7,
    startMinute: 0,
    endHour: 9,
    endMinute: 0,
    weight: 15,
    description: "Early risers, before meetings start",
  },
  {
    band: "mid_morning",
    startHour: 9,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    weight: 25,
    description: "Peak productivity window - catching breaks",
  },
  {
    band: "late_morning",
    startHour: 11,
    startMinute: 0,
    endHour: 12,
    endMinute: 0,
    weight: 20,
    description: "Pre-lunch wind down",
  },
  {
    band: "lunch",
    startHour: 12,
    startMinute: 0,
    endHour: 13,
    endMinute: 30,
    weight: 10,
    description: "Lunch break - lower engagement",
  },
  {
    band: "early_afternoon",
    startHour: 13,
    startMinute: 30,
    endHour: 15,
    endMinute: 0,
    weight: 15,
    description: "Post-lunch recovery",
  },
  {
    band: "mid_afternoon",
    startHour: 15,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    weight: 20,
    description: "Second wind - good response rates",
  },
  {
    band: "late_afternoon",
    startHour: 17,
    startMinute: 0,
    endHour: 18,
    endMinute: 30,
    weight: 18,
    description: "End of day wrap-up",
  },
  {
    band: "evening",
    startHour: 18,
    startMinute: 30,
    endHour: 20,
    endMinute: 0,
    weight: 12,
    description: "Evening check-ins (use sparingly)",
  },
];

/**
 * Day of week preferences
 */
export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface DayConfig {
  day: DayOfWeek;
  dayNumber: number; // 0-6
  weight: number;
  maxMessages: number; // Daily cap for this day
  preferredBands: TimeBand[];
  description: string;
}

/**
 * Day of week configurations
 * Weights represent relative message volume per day
 */
export const DAY_CONFIGS: DayConfig[] = [
  {
    day: "sunday",
    dayNumber: 0,
    weight: 5,
    maxMessages: 100,
    preferredBands: ["late_morning", "early_afternoon"],
    description: "Light Sunday outreach - prep for week",
  },
  {
    day: "monday",
    dayNumber: 1,
    weight: 20,
    maxMessages: 400,
    preferredBands: ["mid_morning", "mid_afternoon"],
    description: "Strong Monday start",
  },
  {
    day: "tuesday",
    dayNumber: 2,
    weight: 25,
    maxMessages: 500,
    preferredBands: ["mid_morning", "late_morning", "mid_afternoon"],
    description: "Peak day - highest response rates",
  },
  {
    day: "wednesday",
    dayNumber: 3,
    weight: 25,
    maxMessages: 500,
    preferredBands: ["mid_morning", "late_morning", "mid_afternoon"],
    description: "Midweek momentum",
  },
  {
    day: "thursday",
    dayNumber: 4,
    weight: 20,
    maxMessages: 400,
    preferredBands: ["mid_morning", "early_afternoon"],
    description: "Thursday push",
  },
  {
    day: "friday",
    dayNumber: 5,
    weight: 15,
    maxMessages: 300,
    preferredBands: ["mid_morning", "late_morning"],
    description: "Friday wind-down - morning focus",
  },
  {
    day: "saturday",
    dayNumber: 6,
    weight: 5,
    maxMessages: 100,
    preferredBands: ["mid_morning"],
    description: "Light Saturday - weekend warriors only",
  },
];

/**
 * Industry-specific timing preferences
 */
export interface IndustryTimingProfile {
  industries: string[];
  preferredDays: DayOfWeek[];
  preferredBands: TimeBand[];
  avoidDays: DayOfWeek[];
  avoidBands: TimeBand[];
  notes: string;
}

export const INDUSTRY_TIMING_PROFILES: IndustryTimingProfile[] = [
  {
    industries: ["restaurant", "food service", "hospitality", "bar"],
    preferredDays: ["monday", "tuesday", "wednesday"],
    preferredBands: ["mid_morning", "mid_afternoon"],
    avoidDays: ["friday", "saturday", "sunday"],
    avoidBands: ["lunch", "evening"],
    notes: "Avoid peak service hours",
  },
  {
    industries: ["retail", "store", "shop", "boutique"],
    preferredDays: ["monday", "tuesday", "wednesday", "thursday"],
    preferredBands: ["early_morning", "mid_morning"],
    avoidDays: ["saturday", "sunday"],
    avoidBands: ["mid_afternoon", "late_afternoon"],
    notes: "Reach before store opens or during slow periods",
  },
  {
    industries: [
      "construction",
      "contractor",
      "builder",
      "trades",
      "plumbing",
      "electrical",
      "HVAC",
    ],
    preferredDays: ["monday", "tuesday", "wednesday", "thursday"],
    preferredBands: ["early_morning", "late_afternoon"],
    avoidDays: [],
    avoidBands: ["mid_morning", "early_afternoon"],
    notes: "Early morning before job sites, or after work",
  },
  {
    industries: [
      "real estate",
      "property management",
      "mortgage",
      "title",
      "insurance",
    ],
    preferredDays: ["tuesday", "wednesday", "thursday"],
    preferredBands: ["mid_morning", "mid_afternoon"],
    avoidDays: [],
    avoidBands: [],
    notes: "Standard business hours work well",
  },
  {
    industries: ["healthcare", "medical", "dental", "clinic", "doctor"],
    preferredDays: ["tuesday", "wednesday", "thursday"],
    preferredBands: ["early_morning", "lunch", "late_afternoon"],
    avoidDays: ["monday"],
    avoidBands: ["mid_morning", "early_afternoon"],
    notes: "Avoid patient hours, catch during breaks",
  },
  {
    industries: ["fitness", "gym", "personal training", "yoga", "martial arts"],
    preferredDays: ["monday", "tuesday", "wednesday"],
    preferredBands: ["mid_morning", "early_afternoon"],
    avoidDays: ["saturday", "sunday"],
    avoidBands: ["early_morning", "evening"],
    notes: "Avoid class times",
  },
  {
    industries: [
      "automotive",
      "auto repair",
      "car dealer",
      "mechanic",
      "body shop",
    ],
    preferredDays: ["monday", "tuesday", "wednesday", "thursday"],
    preferredBands: ["early_morning", "late_afternoon"],
    avoidDays: ["sunday"],
    avoidBands: ["mid_morning"],
    notes: "Early morning or after shop closes",
  },
  {
    industries: [
      "professional services",
      "consulting",
      "accounting",
      "legal",
      "law",
      "attorney",
    ],
    preferredDays: ["tuesday", "wednesday", "thursday"],
    preferredBands: ["mid_morning", "mid_afternoon"],
    avoidDays: [],
    avoidBands: ["early_morning", "evening"],
    notes: "Standard business hours, avoid before 9am",
  },
];

/**
 * Scheduling configuration
 */
export interface SchedulingConfig {
  timezone: string;
  respectIndustryTiming: boolean;
  maxMessagesPerHour: number;
  spreadEvenly: boolean; // Spread messages throughout time band
  jitterMinutes: number; // Random offset to avoid exact timing
}

export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  timezone: "America/New_York",
  respectIndustryTiming: true,
  maxMessagesPerHour: 50, // Stay under carrier limits
  spreadEvenly: true,
  jitterMinutes: 5,
};

/**
 * Get current time band
 */
export function getCurrentTimeBand(
  date: Date = new Date(),
): TimeBandConfig | null {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeValue = hour * 60 + minute;

  for (const band of TIME_BANDS) {
    const startValue = band.startHour * 60 + band.startMinute;
    const endValue = band.endHour * 60 + band.endMinute;

    if (timeValue >= startValue && timeValue < endValue) {
      return band;
    }
  }

  return null;
}

/**
 * Get current day config
 */
export function getCurrentDayConfig(date: Date = new Date()): DayConfig {
  const dayNumber = date.getDay();
  return DAY_CONFIGS.find((d) => d.dayNumber === dayNumber)!;
}

/**
 * Check if current time is within allowed sending window
 */
export function isWithinSendingWindow(date: Date = new Date()): boolean {
  const timeBand = getCurrentTimeBand(date);
  return timeBand !== null;
}

/**
 * Get industry timing profile
 */
export function getIndustryProfile(
  industry: string,
): IndustryTimingProfile | null {
  const normalized = industry.toLowerCase();

  for (const profile of INDUSTRY_TIMING_PROFILES) {
    for (const ind of profile.industries) {
      if (normalized.includes(ind) || ind.includes(normalized)) {
        return profile;
      }
    }
  }

  return null;
}

/**
 * Calculate optimal send time for a lead
 */
export interface ScheduledSend {
  sendAt: Date;
  timeBand: TimeBand;
  dayOfWeek: DayOfWeek;
  reason: string;
}

export function calculateOptimalSendTime(
  lead: LeadContext,
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG,
  after: Date = new Date(),
): ScheduledSend {
  const industryProfile = lead.industry
    ? getIndustryProfile(lead.industry)
    : null;

  // Start from the "after" date
  const candidateDate = new Date(after);
  let attempts = 0;
  const maxAttempts = 14; // Look up to 2 weeks ahead

  while (attempts < maxAttempts) {
    const dayConfig = getCurrentDayConfig(candidateDate);

    // Check if this day is preferred for the industry
    const isDayAllowed =
      !industryProfile ||
      !industryProfile.avoidDays.includes(dayConfig.day as DayOfWeek);

    const isDayPreferred =
      !industryProfile ||
      industryProfile.preferredDays.includes(dayConfig.day as DayOfWeek);

    if (isDayAllowed && (isDayPreferred || attempts > 7)) {
      // Find a good time band for this day
      const preferredBands = industryProfile
        ? industryProfile.preferredBands.filter((b) =>
            dayConfig.preferredBands.includes(b),
          )
        : dayConfig.preferredBands;

      const bandsToCheck =
        preferredBands.length > 0 ? preferredBands : dayConfig.preferredBands;

      for (const bandName of bandsToCheck) {
        const band = TIME_BANDS.find((b) => b.band === bandName);
        if (!band) continue;

        // Check if this band is avoided for the industry
        if (industryProfile?.avoidBands.includes(bandName)) continue;

        // Calculate send time within this band
        const sendTime = new Date(candidateDate);
        sendTime.setHours(band.startHour, band.startMinute, 0, 0);

        // Add jitter
        const jitterMs =
          Math.random() * config.jitterMinutes * 60 * 1000 +
          Math.random() *
            (band.endHour - band.startHour) *
            60 *
            60 *
            1000 *
            0.5;
        sendTime.setTime(sendTime.getTime() + jitterMs);

        // Make sure we're still in the band
        if (sendTime.getHours() < band.endHour && sendTime > after) {
          return {
            sendAt: sendTime,
            timeBand: bandName,
            dayOfWeek: dayConfig.day as DayOfWeek,
            reason: industryProfile
              ? `Industry-optimized: ${industryProfile.notes}`
              : "Standard optimal timing",
          };
        }
      }
    }

    // Move to next day
    candidateDate.setDate(candidateDate.getDate() + 1);
    candidateDate.setHours(7, 0, 0, 0); // Reset to start of sending window
    attempts++;
  }

  // Fallback: next available slot
  const fallbackDate = new Date(after);
  fallbackDate.setDate(fallbackDate.getDate() + 1);
  fallbackDate.setHours(10, 0, 0, 0);

  return {
    sendAt: fallbackDate,
    timeBand: "mid_morning",
    dayOfWeek: DAY_CONFIGS[fallbackDate.getDay()].day as DayOfWeek,
    reason: "Fallback scheduling",
  };
}

/**
 * Generate a batch schedule for multiple leads
 */
export interface BatchSchedule {
  leads: Array<{
    lead: LeadContext;
    scheduledSend: ScheduledSend;
  }>;
  totalMessages: number;
  startDate: Date;
  endDate: Date;
  messagesByDay: Record<string, number>;
  messagesByBand: Record<string, number>;
}

export function generateBatchSchedule(
  leads: LeadContext[],
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG,
  startAfter: Date = new Date(),
): BatchSchedule {
  const scheduled: Array<{
    lead: LeadContext;
    scheduledSend: ScheduledSend;
  }> = [];

  const messagesByDay: Record<string, number> = {};
  const messagesByBand: Record<string, number> = {};
  const dailyCounters: Record<string, number> = {};
  const hourlyCounters: Record<string, number> = {};

  let currentTime = new Date(startAfter);

  for (const lead of leads) {
    // Find optimal time
    let optimalSend = calculateOptimalSendTime(lead, config, currentTime);

    // Check daily limits
    const dayKey = optimalSend.sendAt.toISOString().split("T")[0];
    const dayConfig = getCurrentDayConfig(optimalSend.sendAt);

    if ((dailyCounters[dayKey] || 0) >= dayConfig.maxMessages) {
      // Move to next day
      currentTime = new Date(optimalSend.sendAt);
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(7, 0, 0, 0);
      optimalSend = calculateOptimalSendTime(lead, config, currentTime);
    }

    // Check hourly limits
    const hourKey = `${dayKey}-${optimalSend.sendAt.getHours()}`;
    if ((hourlyCounters[hourKey] || 0) >= config.maxMessagesPerHour) {
      // Spread to next available slot
      currentTime = new Date(optimalSend.sendAt);
      currentTime.setHours(currentTime.getHours() + 1);
      optimalSend = calculateOptimalSendTime(lead, config, currentTime);
    }

    // Record the schedule
    scheduled.push({ lead, scheduledSend: optimalSend });

    // Update counters
    const finalDayKey = optimalSend.sendAt.toISOString().split("T")[0];
    const finalHourKey = `${finalDayKey}-${optimalSend.sendAt.getHours()}`;
    dailyCounters[finalDayKey] = (dailyCounters[finalDayKey] || 0) + 1;
    hourlyCounters[finalHourKey] = (hourlyCounters[finalHourKey] || 0) + 1;
    messagesByDay[optimalSend.dayOfWeek] =
      (messagesByDay[optimalSend.dayOfWeek] || 0) + 1;
    messagesByBand[optimalSend.timeBand] =
      (messagesByBand[optimalSend.timeBand] || 0) + 1;

    // Advance current time slightly for spread
    currentTime = new Date(optimalSend.sendAt);
    currentTime.setMinutes(
      currentTime.getMinutes() + Math.floor(Math.random() * 3) + 1,
    );
  }

  // Calculate date range
  const dates = scheduled.map((s) => s.scheduledSend.sendAt.getTime());
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  return {
    leads: scheduled,
    totalMessages: scheduled.length,
    startDate,
    endDate,
    messagesByDay,
    messagesByBand,
  };
}

/**
 * Check if it's a good time to send right now
 */
export function canSendNow(
  lead: LeadContext,
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG,
): { allowed: boolean; reason: string } {
  const now = new Date();

  // Check if within sending window
  if (!isWithinSendingWindow(now)) {
    return { allowed: false, reason: "Outside sending hours (7am-8pm)" };
  }

  // Check day
  const dayConfig = getCurrentDayConfig(now);
  if (dayConfig.weight < 10) {
    return {
      allowed: false,
      reason: `${dayConfig.day} has low sending weight`,
    };
  }

  // Check industry preferences
  if (config.respectIndustryTiming && lead.industry) {
    const profile = getIndustryProfile(lead.industry);
    if (profile) {
      const currentBand = getCurrentTimeBand(now);
      if (currentBand && profile.avoidBands.includes(currentBand.band)) {
        return {
          allowed: false,
          reason: `${currentBand.band} is avoided for ${lead.industry}`,
        };
      }
      if (profile.avoidDays.includes(dayConfig.day as DayOfWeek)) {
        return {
          allowed: false,
          reason: `${dayConfig.day} is avoided for ${lead.industry}`,
        };
      }
    }
  }

  return { allowed: true, reason: "Clear to send" };
}

/**
 * Get next available send time if can't send now
 */
export function getNextSendTime(
  lead: LeadContext,
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG,
): Date {
  const optimal = calculateOptimalSendTime(lead, config, new Date());
  return optimal.sendAt;
}

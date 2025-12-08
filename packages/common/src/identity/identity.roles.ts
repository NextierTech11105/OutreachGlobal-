/**
 * Identity Roles
 * Role classification and scoring for business contacts
 */

// ============================================
// ROLE TYPES
// ============================================

export type ExecutiveRoleType =
  | 'owner'
  | 'ceo'
  | 'partner'
  | 'investor'
  | 'sales_manager'
  | 'executive'
  | 'manager'
  | 'professional'
  | 'unknown';

export interface RoleClassification {
  roleType: ExecutiveRoleType;
  confidence: number;
  isDecisionMaker: boolean;
  isOwner: boolean;
  isCLevel: boolean;
  isPartner: boolean;
  isInvestor: boolean;
  isSalesLead: boolean;
  originalTitle: string;
  normalizedTitle: string;
}

// ============================================
// TITLE PATTERNS
// ============================================

const OWNER_PATTERNS = [
  /\bowner\b/i,
  /\bproprietor\b/i,
  /\bfounder\b/i,
  /\bco-founder\b/i,
  /\bcofounder\b/i,
  /\bprincipal\b/i,
  /\bsole\s+member\b/i,
  /\bmember\s*[-\/]?\s*manager\b/i,
  /\bmanaging\s+member\b/i,
];

const CEO_PATTERNS = [
  /\bceo\b/i,
  /\bchief\s+executive\b/i,
  /\bpresident\b/i,
  /\bgeneral\s+manager\b/i,
  /\bgm\b/i,
  /\bcoo\b/i,
  /\bchief\s+operating\b/i,
  /\bcfo\b/i,
  /\bchief\s+financial\b/i,
  /\bcto\b/i,
  /\bchief\s+technology\b/i,
  /\bcmo\b/i,
  /\bchief\s+marketing\b/i,
  /\bc-suite\b/i,
  /\bchief\b.*\bofficer\b/i,
];

const PARTNER_PATTERNS = [
  /\bpartner\b/i,
  /\bmanaging\s+partner\b/i,
  /\bgeneral\s+partner\b/i,
  /\blimited\s+partner\b/i,
  /\bequity\s+partner\b/i,
  /\bassociate\s+partner\b/i,
  /\bjoint\s+venture\b/i,
];

const INVESTOR_PATTERNS = [
  /\binvestor\b/i,
  /\binvestment\b/i,
  /\bcapital\b/i,
  /\bventure\b/i,
  /\bprivate\s+equity\b/i,
  /\bangel\b/i,
  /\bfund\s+manager\b/i,
  /\bportfolio\b/i,
  /\basset\s+manager\b/i,
  /\bwealth\s+manager\b/i,
];

const SALES_MANAGER_PATTERNS = [
  /\bsales\s+manager\b/i,
  /\bsales\s+director\b/i,
  /\bvp\s+of\s+sales\b/i,
  /\bvp\s+sales\b/i,
  /\bhead\s+of\s+sales\b/i,
  /\bsales\s+lead\b/i,
  /\bbusiness\s+development\s+manager\b/i,
  /\bbd\s+manager\b/i,
  /\baccount\s+executive\b/i,
  /\bregional\s+manager\b/i,
  /\bterritory\s+manager\b/i,
  /\bsales\s+vp\b/i,
  /\bchief\s+revenue\b/i,
  /\bcro\b/i,
];

const EXECUTIVE_PATTERNS = [
  /\bvice\s+president\b/i,
  /\bvp\b/i,
  /\bevp\b/i,
  /\bsvp\b/i,
  /\bdirector\b/i,
  /\bexecutive\b/i,
  /\bmanaging\s+director\b/i,
  /\bboard\s+member\b/i,
  /\btrustee\b/i,
  /\bchairman\b/i,
  /\bchairperson\b/i,
];

const MANAGER_PATTERNS = [
  /\bmanager\b/i,
  /\bsupervisor\b/i,
  /\bteam\s+lead\b/i,
  /\bdepartment\s+head\b/i,
  /\boperations\s+manager\b/i,
  /\bproject\s+manager\b/i,
  /\boffice\s+manager\b/i,
];

// ============================================
// CLASSIFICATION FUNCTION
// ============================================

export function classifyRole(title: string): RoleClassification {
  if (!title || typeof title !== 'string') {
    return {
      roleType: 'unknown',
      confidence: 0,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title || '',
      normalizedTitle: '',
    };
  }

  const normalizedTitle = normalizeTitle(title);

  // Check patterns in priority order
  if (matchesAny(normalizedTitle, OWNER_PATTERNS)) {
    return {
      roleType: 'owner',
      confidence: 0.95,
      isDecisionMaker: true,
      isOwner: true,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, CEO_PATTERNS)) {
    return {
      roleType: 'ceo',
      confidence: 0.9,
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: true,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, PARTNER_PATTERNS)) {
    return {
      roleType: 'partner',
      confidence: 0.85,
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: false,
      isPartner: true,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, INVESTOR_PATTERNS)) {
    return {
      roleType: 'investor',
      confidence: 0.8,
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: true,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, SALES_MANAGER_PATTERNS)) {
    return {
      roleType: 'sales_manager',
      confidence: 0.85,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: true,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, EXECUTIVE_PATTERNS)) {
    return {
      roleType: 'executive',
      confidence: 0.75,
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  if (matchesAny(normalizedTitle, MANAGER_PATTERNS)) {
    return {
      roleType: 'manager',
      confidence: 0.7,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  // Check for professional titles
  if (isProfessionalTitle(normalizedTitle)) {
    return {
      roleType: 'professional',
      confidence: 0.6,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      originalTitle: title,
      normalizedTitle,
    };
  }

  return {
    roleType: 'unknown',
    confidence: 0.1,
    isDecisionMaker: false,
    isOwner: false,
    isCLevel: false,
    isPartner: false,
    isInvestor: false,
    isSalesLead: false,
    originalTitle: title,
    normalizedTitle,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text));
}

function isProfessionalTitle(title: string): boolean {
  const professionalPatterns = [
    /\bengineer\b/i,
    /\bdeveloper\b/i,
    /\banalyst\b/i,
    /\bconsultant\b/i,
    /\bspecialist\b/i,
    /\bcoordinator\b/i,
    /\badministrator\b/i,
    /\baccountant\b/i,
    /\battorney\b/i,
    /\blawyer\b/i,
    /\barchitect\b/i,
    /\bdesigner\b/i,
    /\bmarketer\b/i,
  ];
  return matchesAny(title, professionalPatterns);
}

// ============================================
// SCORING FUNCTIONS
// ============================================

export interface RoleScore {
  roleWeight: number;
  decisionMakerBonus: number;
  totalScore: number;
}

export function scoreRole(classification: RoleClassification): RoleScore {
  const roleWeights: Record<ExecutiveRoleType, number> = {
    owner: 100,
    ceo: 95,
    partner: 85,
    investor: 80,
    sales_manager: 70,
    executive: 65,
    manager: 50,
    professional: 30,
    unknown: 10,
  };

  const roleWeight = roleWeights[classification.roleType];
  const decisionMakerBonus = classification.isDecisionMaker ? 15 : 0;

  return {
    roleWeight,
    decisionMakerBonus,
    totalScore: roleWeight + decisionMakerBonus,
  };
}

// ============================================
// CAMPAIGN ROUTING
// ============================================

export type CampaignAgent = 'sabrina' | 'gianna';

export interface CampaignRouting {
  agent: CampaignAgent;
  priority: 'high' | 'medium' | 'low';
  channel: 'sms' | 'email' | 'both';
  reason: string;
}

export function routeToCampaign(classification: RoleClassification): CampaignRouting {
  // Owners, CEOs, Partners, Investors -> Gianna SMS (decision makers)
  if (classification.isDecisionMaker) {
    return {
      agent: 'gianna',
      priority: classification.roleType === 'owner' ? 'high' : 'medium',
      channel: 'sms',
      reason: `Decision maker: ${classification.roleType}`,
    };
  }

  // Sales managers -> Sabrina Email (relationship building)
  if (classification.isSalesLead) {
    return {
      agent: 'sabrina',
      priority: 'medium',
      channel: 'email',
      reason: 'Sales lead for relationship building',
    };
  }

  // Managers -> Sabrina Email
  if (classification.roleType === 'manager') {
    return {
      agent: 'sabrina',
      priority: 'low',
      channel: 'email',
      reason: 'Manager contact for warm intro',
    };
  }

  // Default -> Sabrina Email with low priority
  return {
    agent: 'sabrina',
    priority: 'low',
    channel: 'email',
    reason: 'General contact discovery',
  };
}

// ============================================
// BATCH PROCESSING
// ============================================

export interface RoleAnalysisResult {
  title: string;
  classification: RoleClassification;
  score: RoleScore;
  routing: CampaignRouting;
}

export function analyzeRoles(titles: string[]): RoleAnalysisResult[] {
  return titles.map(title => {
    const classification = classifyRole(title);
    const score = scoreRole(classification);
    const routing = routeToCampaign(classification);

    return {
      title,
      classification,
      score,
      routing,
    };
  });
}

export function findBestContact(results: RoleAnalysisResult[]): RoleAnalysisResult | null {
  if (results.length === 0) return null;

  // Sort by total score descending
  const sorted = [...results].sort((a, b) => b.score.totalScore - a.score.totalScore);
  return sorted[0];
}

export function groupByAgent(results: RoleAnalysisResult[]): Record<CampaignAgent, RoleAnalysisResult[]> {
  return results.reduce((acc, result) => {
    const agent = result.routing.agent;
    if (!acc[agent]) acc[agent] = [];
    acc[agent].push(result);
    return acc;
  }, {} as Record<CampaignAgent, RoleAnalysisResult[]>);
}

/**
 * NEXTIER ↔ SIGNALHOUSE MULTI-TENANT BRAND MAPPING
 *
 * Architecture:
 * - Nextier "teams" map to SignalHouse "sub-groups"
 * - Nextier "organizations" map to SignalHouse "brands" (10DLC)
 * - Each brand can have multiple sub-groups for department isolation
 *
 * Brand Hierarchy:
 * ├─ Nextier Holdings (Parent Brand - 10DLC registered)
 * │  ├─ Nextier Consulting (Sub-group)
 * │  ├─ Nextier Technologies (Sub-group)
 * │  ├─ Nextier System Design (Sub-group)
 * │  └─ [Your internal teams mapped here]
 */

import {
  createSubGroup,
  getSubGroups,
  createBrand,
  getBrandByName,
  type SubGroup,
  type Brand,
  type CreateBrandInput,
} from "./client";

// ============ BRAND CONFIGURATION ============

export interface NextierBrand {
  id: string;
  name: string;
  displayName: string;
  legalName: string;
  ein?: string;
  website?: string;
  vertical: string;
  entityType:
    | "PRIVATE_PROFIT"
    | "PUBLIC_PROFIT"
    | "NON_PROFIT"
    | "SOLE_PROPRIETOR";
  signalhouseBrandId?: string; // Populated after registration
  isParent?: boolean;
}

export interface NextierSubBrand {
  id: string;
  parentBrandId: string;
  name: string;
  displayName: string;
  description: string;
  signalhouseSubGroupId?: string; // Populated after creation
  teamIds: string[]; // Nextier team IDs that belong to this sub-brand
}

// Master brand configuration
export const NEXTIER_BRANDS: NextierBrand[] = [
  {
    id: "nextier_holdings",
    name: "Nextier Holdings",
    displayName: "Nextier Holdings LLC",
    legalName: "Nextier Holdings LLC",
    website: "https://nextier.io",
    vertical: "TECHNOLOGY",
    entityType: "PRIVATE_PROFIT",
    isParent: true,
  },
];

// Sub-brand configuration (maps to SignalHouse sub-groups)
export const NEXTIER_SUB_BRANDS: NextierSubBrand[] = [
  {
    id: "nextier_consulting",
    parentBrandId: "nextier_holdings",
    name: "Nextier Consulting",
    displayName: "Nextier Consulting",
    description: "Business consulting and advisory services",
    teamIds: [],
  },
  {
    id: "nextier_technologies",
    parentBrandId: "nextier_holdings",
    name: "Nextier Technologies",
    displayName: "Nextier Technologies",
    description: "Software development and technology solutions",
    teamIds: [],
  },
  {
    id: "nextier_system_design",
    parentBrandId: "nextier_holdings",
    name: "Nextier System Design",
    displayName: "Nextier System Design",
    description: "Systems architecture and infrastructure",
    teamIds: [],
  },
];

// ============ MAPPING FUNCTIONS ============

/**
 * Get SignalHouse sub-group ID for a Nextier team
 */
export function getSubGroupForTeam(
  teamId: string,
): NextierSubBrand | undefined {
  return NEXTIER_SUB_BRANDS.find((sb) => sb.teamIds.includes(teamId));
}

/**
 * Get the parent brand for a sub-brand
 */
export function getParentBrand(subBrandId: string): NextierBrand | undefined {
  const subBrand = NEXTIER_SUB_BRANDS.find((sb) => sb.id === subBrandId);
  if (!subBrand) return undefined;
  return NEXTIER_BRANDS.find((b) => b.id === subBrand.parentBrandId);
}

/**
 * Add a team to a sub-brand mapping
 */
export function mapTeamToSubBrand(teamId: string, subBrandId: string): void {
  const subBrand = NEXTIER_SUB_BRANDS.find((sb) => sb.id === subBrandId);
  if (subBrand && !subBrand.teamIds.includes(teamId)) {
    subBrand.teamIds.push(teamId);
  }
}

// ============ SIGNALHOUSE SYNC FUNCTIONS ============

/**
 * Ensure all brands are registered in SignalHouse
 */
export async function syncBrandsToSignalHouse(): Promise<{
  success: boolean;
  brands: { name: string; signalhouseId?: string; error?: string }[];
}> {
  const results: { name: string; signalhouseId?: string; error?: string }[] =
    [];

  for (const brand of NEXTIER_BRANDS) {
    try {
      // Check if brand already exists
      const existing = await getBrandByName(brand.name);
      if (existing.success && existing.data) {
        brand.signalhouseBrandId = existing.data.brandId;
        results.push({
          name: brand.name,
          signalhouseId: existing.data.brandId,
        });
        continue;
      }

      // Create new brand
      const input: CreateBrandInput = {
        legalCompanyName: brand.legalName,
        brandName: brand.name,
        ein: brand.ein,
        website: brand.website,
        vertical: brand.vertical,
        entityType: brand.entityType,
      };

      const created = await createBrand(input);
      if (created.success && created.data) {
        brand.signalhouseBrandId = created.data.brandId;
        results.push({ name: brand.name, signalhouseId: created.data.brandId });
      } else {
        results.push({ name: brand.name, error: created.error });
      }
    } catch (error) {
      results.push({
        name: brand.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: results.every((r) => !r.error),
    brands: results,
  };
}

/**
 * Ensure all sub-brands are created as SignalHouse sub-groups
 */
export async function syncSubBrandsToSignalHouse(): Promise<{
  success: boolean;
  subBrands: { name: string; signalhouseId?: string; error?: string }[];
}> {
  const results: { name: string; signalhouseId?: string; error?: string }[] =
    [];

  // Get existing sub-groups
  const existingResult = await getSubGroups();
  const existingSubGroups: SubGroup[] = existingResult.success
    ? (existingResult.data as SubGroup[]) || []
    : [];

  for (const subBrand of NEXTIER_SUB_BRANDS) {
    try {
      // Check if sub-group already exists by name
      const existing = existingSubGroups.find(
        (sg) => sg.name === subBrand.name,
      );
      if (existing) {
        subBrand.signalhouseSubGroupId = existing.subGroupId;
        results.push({
          name: subBrand.name,
          signalhouseId: existing.subGroupId,
        });
        continue;
      }

      // Create new sub-group
      const created = await createSubGroup({
        name: subBrand.name,
        description: subBrand.description,
      });

      if (created.success && created.data) {
        subBrand.signalhouseSubGroupId = created.data.subGroupId;
        results.push({
          name: subBrand.name,
          signalhouseId: created.data.subGroupId,
        });
      } else {
        results.push({ name: subBrand.name, error: created.error });
      }
    } catch (error) {
      results.push({
        name: subBrand.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: results.every((r) => !r.error),
    subBrands: results,
  };
}

/**
 * Full sync: brands + sub-brands
 */
export async function fullTenantSync(): Promise<{
  success: boolean;
  brands: { name: string; signalhouseId?: string; error?: string }[];
  subBrands: { name: string; signalhouseId?: string; error?: string }[];
}> {
  const brandsResult = await syncBrandsToSignalHouse();
  const subBrandsResult = await syncSubBrandsToSignalHouse();

  return {
    success: brandsResult.success && subBrandsResult.success,
    brands: brandsResult.brands,
    subBrands: subBrandsResult.subBrands,
  };
}

// ============ TEAM → SIGNALHOUSE CONTEXT ============

export interface SignalHouseContext {
  brandId: string;
  brandName: string;
  subGroupId?: string;
  subGroupName?: string;
  fromNumber?: string;
}

/**
 * Get SignalHouse context for a team (for sending messages)
 */
export async function getSignalHouseContextForTeam(
  teamId: string,
): Promise<SignalHouseContext | null> {
  const subBrand = getSubGroupForTeam(teamId);
  if (!subBrand) {
    // No sub-brand mapping, use parent brand
    const parentBrand = NEXTIER_BRANDS.find((b) => b.isParent);
    if (!parentBrand?.signalhouseBrandId) return null;

    return {
      brandId: parentBrand.signalhouseBrandId,
      brandName: parentBrand.name,
    };
  }

  const parentBrand = getParentBrand(subBrand.id);
  if (!parentBrand?.signalhouseBrandId) return null;

  return {
    brandId: parentBrand.signalhouseBrandId,
    brandName: parentBrand.name,
    subGroupId: subBrand.signalhouseSubGroupId,
    subGroupName: subBrand.name,
  };
}

// ============ ADMIN OPERATIONS ============

/**
 * List all tenant mappings for admin dashboard
 */
export function getAllTenantMappings(): {
  brands: NextierBrand[];
  subBrands: NextierSubBrand[];
} {
  return {
    brands: NEXTIER_BRANDS,
    subBrands: NEXTIER_SUB_BRANDS,
  };
}

/**
 * Add a new sub-brand dynamically
 */
export async function addSubBrand(
  parentBrandId: string,
  name: string,
  displayName: string,
  description: string,
): Promise<{ success: boolean; subBrand?: NextierSubBrand; error?: string }> {
  const parentBrand = NEXTIER_BRANDS.find((b) => b.id === parentBrandId);
  if (!parentBrand) {
    return { success: false, error: "Parent brand not found" };
  }

  // Create in SignalHouse
  const result = await createSubGroup({ name, description });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Add to local config
  const newSubBrand: NextierSubBrand = {
    id: `sub_${Date.now()}`,
    parentBrandId,
    name,
    displayName,
    description,
    signalhouseSubGroupId: result.data?.subGroupId,
    teamIds: [],
  };

  NEXTIER_SUB_BRANDS.push(newSubBrand);

  return { success: true, subBrand: newSubBrand };
}

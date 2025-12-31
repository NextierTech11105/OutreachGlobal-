/**
 * NEVA Location Intelligence - Mapbox Integration
 *
 * INTERNAL COPILOT ONLY - Never handles external responses.
 *
 * Uses Mapbox for:
 * 1. Address Geocoding - Convert addresses to lat/lng
 * 2. Location Validation - Verify business addresses exist
 * 3. Enrichment - Add geocoded data to leads
 * 4. Proximity Analysis - Distance calculations for service areas
 */

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// =============================================================================
// TYPES
// =============================================================================

export interface GeocodedAddress {
  originalAddress: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  accuracy: 'rooftop' | 'point' | 'interpolated' | 'approximate';
  confidence: number; // 0-100
  placeType: string;
  components: AddressComponents;
  isValid: boolean;
  validationNotes: string[];
}

export interface AddressComponents {
  streetNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  neighborhood?: string;
  county?: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  geocoded: GeocodedAddress | null;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'address_not_found' | 'partial_match' | 'ambiguous' | 'state_mismatch' | 'zip_mismatch' | 'invalid_format';
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ProximityResult {
  leadId: string;
  distanceMiles: number;
  distanceKm: number;
  drivingEstimate?: string;
}

// =============================================================================
// GEOCODING
// =============================================================================

/**
 * Geocode a single address using Mapbox
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodedAddress | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('MAPBOX_ACCESS_TOKEN not configured');
    return null;
  }

  const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
  const encodedAddress = encodeURIComponent(fullAddress);

  try {
    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=US&limit=1&types=address,place,locality`
    );

    if (!response.ok) {
      console.error('Mapbox geocoding failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;

    // Extract address components from context
    const components = parseMapboxContext(feature);

    // Determine accuracy level
    let accuracy: GeocodedAddress['accuracy'] = 'approximate';
    if (feature.place_type.includes('address')) {
      accuracy = feature.properties?.accuracy || 'point';
    } else if (feature.place_type.includes('poi')) {
      accuracy = 'rooftop';
    }

    // Calculate confidence based on relevance score
    const confidence = Math.round((feature.relevance || 0) * 100);

    return {
      originalAddress: fullAddress,
      formattedAddress: feature.place_name,
      coordinates: { lat, lng },
      accuracy,
      confidence,
      placeType: feature.place_type[0],
      components,
      isValid: confidence >= 70,
      validationNotes: [],
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Parse Mapbox context array into structured address components
 */
function parseMapboxContext(feature: any): AddressComponents {
  const components: AddressComponents = {};
  const context = feature.context || [];

  // Handle the main feature text
  if (feature.address && feature.text) {
    components.streetNumber = feature.address;
    components.street = feature.text;
  }

  // Parse context array
  for (const item of context) {
    if (item.id.startsWith('place')) {
      components.city = item.text;
    } else if (item.id.startsWith('region')) {
      components.state = item.text;
      components.stateCode = item.short_code?.replace('US-', '');
    } else if (item.id.startsWith('postcode')) {
      components.postalCode = item.text;
    } else if (item.id.startsWith('country')) {
      components.country = item.text;
      components.countryCode = item.short_code;
    } else if (item.id.startsWith('neighborhood')) {
      components.neighborhood = item.text;
    } else if (item.id.startsWith('district')) {
      components.county = item.text;
    }
  }

  return components;
}

// =============================================================================
// ADDRESS VALIDATION
// =============================================================================

/**
 * Validate a business address against Mapbox
 * Returns validation result with confidence and issues
 */
export async function validateBusinessAddress(
  address: string,
  city: string,
  state: string,
  zip?: string
): Promise<LocationValidationResult> {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Basic format validation
  if (!address || address.trim().length < 5) {
    issues.push({
      type: 'invalid_format',
      description: 'Address is too short or missing',
      severity: 'error',
    });
    return { isValid: false, confidence: 0, geocoded: null, issues, suggestions };
  }

  // Geocode the address
  const geocoded = await geocodeAddress(address, city, state, zip);

  if (!geocoded) {
    issues.push({
      type: 'address_not_found',
      description: 'Address could not be geocoded',
      severity: 'error',
    });
    suggestions.push('Verify the street address is correct');
    suggestions.push('Check for typos in city or state');
    return { isValid: false, confidence: 0, geocoded: null, issues, suggestions };
  }

  // Check for state mismatch
  if (geocoded.components.stateCode && geocoded.components.stateCode !== state) {
    issues.push({
      type: 'state_mismatch',
      description: `State mismatch: expected ${state}, found ${geocoded.components.stateCode}`,
      severity: 'warning',
    });
  }

  // Check for zip mismatch
  if (zip && geocoded.components.postalCode && !geocoded.components.postalCode.startsWith(zip.substring(0, 5))) {
    issues.push({
      type: 'zip_mismatch',
      description: `ZIP code mismatch: expected ${zip}, found ${geocoded.components.postalCode}`,
      severity: 'warning',
    });
  }

  // Check for partial match
  if (geocoded.accuracy === 'approximate' || geocoded.accuracy === 'interpolated') {
    issues.push({
      type: 'partial_match',
      description: 'Address matched approximately, not exact rooftop',
      severity: 'info',
    });
  }

  // Check confidence
  if (geocoded.confidence < 70) {
    issues.push({
      type: 'ambiguous',
      description: 'Low confidence in address match',
      severity: 'warning',
    });
    suggestions.push('Consider verifying this address manually');
  }

  // Determine overall validity
  const hasErrors = issues.some(i => i.severity === 'error');
  const isValid = !hasErrors && geocoded.confidence >= 60;

  return {
    isValid,
    confidence: geocoded.confidence,
    geocoded,
    issues,
    suggestions,
  };
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

/**
 * Batch validate multiple addresses from USBizData
 * Returns map of lead IDs to validation results
 */
export async function batchValidateAddresses(
  businesses: Array<{
    id: string;
    address: string;
    city: string;
    state: string;
    zip?: string;
  }>,
  options?: {
    maxConcurrent?: number;
    delayMs?: number;
  }
): Promise<Map<string, LocationValidationResult>> {
  const results = new Map<string, LocationValidationResult>();
  const maxConcurrent = options?.maxConcurrent || 5;
  const delayMs = options?.delayMs || 200; // Mapbox rate limits

  for (let i = 0; i < businesses.length; i += maxConcurrent) {
    const batch = businesses.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (biz) => {
        try {
          const validation = await validateBusinessAddress(
            biz.address,
            biz.city,
            biz.state,
            biz.zip
          );
          return { id: biz.id, validation };
        } catch (error) {
          console.error(`Validation failed for ${biz.id}:`, error);
          return {
            id: biz.id,
            validation: {
              isValid: false,
              confidence: 0,
              geocoded: null,
              issues: [{ type: 'address_not_found' as const, description: 'Validation error', severity: 'error' as const }],
              suggestions: [],
            },
          };
        }
      })
    );

    for (const { id, validation } of batchResults) {
      results.set(id, validation);
    }

    // Rate limiting delay
    if (i + maxConcurrent < businesses.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// =============================================================================
// PROXIMITY ANALYSIS
// =============================================================================

/**
 * Calculate distance between a reference point and multiple leads
 * Useful for service area analysis
 */
export function calculateDistances(
  referencePoint: { lat: number; lng: number },
  leads: Array<{ id: string; lat: number; lng: number }>
): ProximityResult[] {
  return leads.map(lead => {
    const distanceKm = haversineDistance(
      referencePoint.lat,
      referencePoint.lng,
      lead.lat,
      lead.lng
    );
    const distanceMiles = distanceKm * 0.621371;

    return {
      leadId: lead.id,
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
  }).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/**
 * Haversine formula for distance calculation
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// =============================================================================
// ENRICHMENT
// =============================================================================

/**
 * Enrich lead with geocoded location data
 * Call after validation to add coordinates and formatted address
 */
export async function enrichLeadWithLocation(
  leadId: string,
  address: string,
  city: string,
  state: string,
  zip?: string
): Promise<{
  leadId: string;
  enriched: boolean;
  coordinates?: { lat: number; lng: number };
  formattedAddress?: string;
  error?: string;
}> {
  const geocoded = await geocodeAddress(address, city, state, zip);

  if (!geocoded || !geocoded.isValid) {
    return {
      leadId,
      enriched: false,
      error: 'Could not geocode address',
    };
  }

  return {
    leadId,
    enriched: true,
    coordinates: geocoded.coordinates,
    formattedAddress: geocoded.formattedAddress,
  };
}

// =============================================================================
// REVERSE GEOCODING
// =============================================================================

/**
 * Get address from coordinates (reverse geocoding)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<AddressComponents | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('MAPBOX_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=US&limit=1`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    return parseMapboxContext(data.features[0]);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Globally unique region code.
 *
 * Format is COUNTRY_REGION. COUNTRY is an ISO 3166-1 alpha-3 code; REGION is a string.
 */
export type RegionCode = `${string}_${string}`;

/**
 * Globally unique identifier for a route.
 */
export type Id = string & { readonly __id: unique symbol };

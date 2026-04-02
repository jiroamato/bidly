import type { LocationResult } from "./types";

/**
 * Map of Canadian cities/regions to their province (lowercase).
 * NCR spans Ontario and Quebec — Ottawa is in Ontario, Gatineau is in Quebec.
 */
const REGION_TO_PROVINCES: Record<string, string[]> = {
  "national capital region": ["ontario", "quebec", "québec"],
  ncr: ["ontario", "quebec", "québec"],
  // Ontario cities
  ottawa: ["ontario"],
  toronto: ["ontario"],
  hamilton: ["ontario"],
  kingston: ["ontario"],
  "quinte west": ["ontario"],
  barrie: ["ontario"],
  "new tecumseth": ["ontario"],
  "thunder bay": ["ontario"],
  petawawa: ["ontario"],
  london: ["ontario"],
  windsor: ["ontario"],
  kitchener: ["ontario"],
  // Quebec cities
  gatineau: ["quebec", "québec"],
  montréal: ["quebec", "québec"],
  montreal: ["quebec", "québec"],
  "montréal-est": ["quebec", "québec"],
  laval: ["quebec", "québec"],
  longueuil: ["quebec", "québec"],
  québec: ["quebec", "québec"],
  shawinigan: ["quebec", "québec"],
  "sept-îles": ["quebec", "québec"],
  cowansville: ["quebec", "québec"],
  boucherville: ["quebec", "québec"],
  "mont-royal": ["quebec", "québec"],
  "capitale-nationale (québec)": ["quebec", "québec"],
  // Other provinces
  victoria: ["british columbia"],
  vancouver: ["british columbia"],
  edmonton: ["alberta"],
  calgary: ["alberta"],
  "cold lake": ["alberta"],
  wainwright: ["alberta"],
  banff: ["alberta"],
  regina: ["saskatchewan"],
  "prince albert": ["saskatchewan"],
  winnipeg: ["manitoba"],
  "st. john's": ["newfoundland"],
  yellowknife: ["northwest territories"],
};

export function scoreLocation(
  profileProvince: string,
  regionsOfDelivery: string[]
): LocationResult {
  if (!profileProvince || regionsOfDelivery.length === 0) {
    return { score: 0 };
  }

  const province = profileProvince.toLowerCase();

  for (const region of regionsOfDelivery) {
    const normalizedRegion = region.toLowerCase().trim();

    // Direct match: region contains the province name (e.g. "Ontario (except NCR)")
    if (
      normalizedRegion.includes(province) ||
      normalizedRegion.includes("canada")
    ) {
      return { score: 100 };
    }

    // Reverse lookup: map city/region names to provinces
    for (const [key, provinces] of Object.entries(REGION_TO_PROVINCES)) {
      if (normalizedRegion.includes(key) && provinces.includes(province)) {
        return { score: 100 };
      }
    }
  }

  return { score: 0 };
}

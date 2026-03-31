import type { LocationResult } from "./types";

export function scoreLocation(
  profileProvince: string,
  regionsOfDelivery: string[]
): LocationResult {
  if (!profileProvince || regionsOfDelivery.length === 0) {
    return { score: 0 };
  }

  const province = profileProvince.toLowerCase();

  for (const region of regionsOfDelivery) {
    const normalizedRegion = region.toLowerCase();
    if (
      normalizedRegion.includes(province) ||
      normalizedRegion.includes("canada")
    ) {
      return { score: 100 };
    }
  }

  return { score: 0 };
}

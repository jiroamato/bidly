import type { CategoryResult } from "./types";

const NAICS_TO_CATEGORIES: Record<string, string[]> = {
  "11": ["Goods", "Agriculture"],
  "21": ["Goods", "Mining"],
  "22": ["Services", "Utilities"],
  "23": ["Construction"],
  "31": ["Goods", "Manufacturing"],
  "32": ["Goods", "Manufacturing"],
  "33": ["Goods", "Manufacturing"],
  "41": ["Goods", "Wholesale"],
  "42": ["Goods", "Wholesale"],
  "44": ["Goods", "Retail"],
  "45": ["Goods", "Retail"],
  "48": ["Services", "Transportation"],
  "49": ["Services", "Transportation"],
  "51": ["Services", "IT Services", "Professional Services"],
  "52": ["Services", "Financial Services"],
  "53": ["Services", "Real Estate"],
  "54": ["Services", "Professional Services"],
  "55": ["Services", "Management"],
  "56": ["Services", "Administrative Services"],
  "61": ["Services", "Education"],
  "62": ["Services", "Healthcare"],
  "71": ["Services", "Arts and Recreation"],
  "72": ["Services", "Accommodation"],
  "81": ["Services", "Repair and Maintenance"],
  "91": ["Services", "Public Administration"],
  "92": ["Services", "Public Administration"],
};

/**
 * Maps procurement category codes to normalized category names.
 * Canadian government tenders use codes like "*SRV", "*GD", "*CNST", "*SRVTGD".
 */
const PROCUREMENT_CODE_MAP: Record<string, string[]> = {
  srv: ["services"],
  gds: ["goods"],
  gd: ["goods"],
  con: ["construction"],
  cnst: ["construction"],
  srvtgd: ["services", "goods"],
};

export function naicsToCategories(naicsCodes: string[]): string[] {
  const categories = new Set<string>();
  for (const code of naicsCodes) {
    const prefix = code.slice(0, 2);
    const mapped = NAICS_TO_CATEGORIES[prefix];
    if (mapped) {
      for (const cat of mapped) {
        categories.add(cat);
      }
    }
  }
  return [...categories];
}

export function scoreCategory(
  naicsCodes: string[],
  tenderCategory: string
): CategoryResult {
  const profileCategories = naicsToCategories(naicsCodes);

  if (profileCategories.length === 0 || !tenderCategory) {
    return { score: 0, profileCategories, tenderCategory };
  }

  // Strip leading * and normalize (e.g., "*SRV" -> "srv")
  const normalizedTender = tenderCategory.toLowerCase().trim().replace(/^\*/, "");

  const expandedTenderCategories = PROCUREMENT_CODE_MAP[normalizedTender] || [
    normalizedTender,
  ];

  for (const profileCat of profileCategories) {
    const normalizedProfile = profileCat.toLowerCase();
    for (const tenderCat of expandedTenderCategories) {
      if (normalizedProfile === tenderCat) {
        return { score: 100, profileCategories, tenderCategory };
      }
    }
  }

  for (const profileCat of profileCategories) {
    const normalizedProfile = profileCat.toLowerCase();
    for (const tenderCat of expandedTenderCategories) {
      if (
        normalizedProfile.includes(tenderCat) ||
        tenderCat.includes(normalizedProfile)
      ) {
        return { score: 50, profileCategories, tenderCategory };
      }
    }
  }

  return { score: 0, profileCategories, tenderCategory };
}

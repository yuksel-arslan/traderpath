// ===========================================
// Asset Logos Service
// Manages logo data storage and retrieval
// ===========================================

import { PrismaClient } from '@prisma/client';
import {
  CRYPTO_LOGOS,
  STOCK_LOGOS,
  METAL_LOGOS,
  BOND_LOGOS,
  AssetLogoInfo,
  AssetLogosMap,
  AssetClass,
  getAssetLogoInfo,
  detectAssetClass,
} from './asset-logos.data';

const prisma = new PrismaClient();

// Current schema version
const SCHEMA_VERSION = 1;

/**
 * Initialize asset logos in database
 * Called on server startup to ensure logos are seeded
 */
export async function initializeAssetLogos(): Promise<void> {
  try {
    // Check if default record exists
    const existing = await prisma.assetLogos.findUnique({
      where: { id: 'default' },
    });

    if (!existing) {
      // Create initial record with all logos
      await prisma.assetLogos.create({
        data: {
          id: 'default',
          cryptoLogos: CRYPTO_LOGOS,
          stockLogos: STOCK_LOGOS,
          metalLogos: METAL_LOGOS,
          bondLogos: BOND_LOGOS,
          version: SCHEMA_VERSION,
        },
      });
      console.log('[AssetLogos] Initialized logo database with default data');
    } else if (existing.version < SCHEMA_VERSION) {
      // Update logos if schema version changed
      await prisma.assetLogos.update({
        where: { id: 'default' },
        data: {
          cryptoLogos: CRYPTO_LOGOS,
          stockLogos: STOCK_LOGOS,
          metalLogos: METAL_LOGOS,
          bondLogos: BOND_LOGOS,
          version: SCHEMA_VERSION,
          lastUpdated: new Date(),
        },
      });
      console.log(`[AssetLogos] Updated logos from v${existing.version} to v${SCHEMA_VERSION}`);
    }
  } catch (error) {
    console.error('[AssetLogos] Failed to initialize:', error);
    // Non-critical - fallback to static data
  }
}

/**
 * Get all logos from database (or fallback to static)
 */
export async function getAllLogos(): Promise<{
  crypto: AssetLogosMap;
  stocks: AssetLogosMap;
  metals: AssetLogosMap;
  bonds: AssetLogosMap;
  version: number;
  lastUpdated: Date;
}> {
  try {
    const record = await prisma.assetLogos.findUnique({
      where: { id: 'default' },
    });

    if (record) {
      return {
        crypto: record.cryptoLogos as AssetLogosMap,
        stocks: record.stockLogos as AssetLogosMap,
        metals: record.metalLogos as AssetLogosMap,
        bonds: record.bondLogos as AssetLogosMap,
        version: record.version,
        lastUpdated: record.lastUpdated,
      };
    }
  } catch (error) {
    console.error('[AssetLogos] Failed to fetch from DB:', error);
  }

  // Fallback to static data
  return {
    crypto: CRYPTO_LOGOS,
    stocks: STOCK_LOGOS,
    metals: METAL_LOGOS,
    bonds: BOND_LOGOS,
    version: SCHEMA_VERSION,
    lastUpdated: new Date(),
  };
}

/**
 * Get logos by asset class
 */
export async function getLogosByAssetClass(assetClass: AssetClass): Promise<AssetLogosMap> {
  const all = await getAllLogos();

  switch (assetClass) {
    case 'crypto':
      return all.crypto;
    case 'stocks':
      return all.stocks;
    case 'metals':
      return all.metals;
    case 'bonds':
      return all.bonds;
    default:
      return all.crypto;
  }
}

/**
 * Get single logo info
 */
export async function getLogoForSymbol(
  symbol: string,
  assetClass?: AssetClass
): Promise<AssetLogoInfo | null> {
  // First try static lookup (faster)
  const staticResult = getAssetLogoInfo(symbol, assetClass);
  if (staticResult) {
    return staticResult;
  }

  // Fall back to database lookup for custom logos
  try {
    const record = await prisma.assetLogos.findUnique({
      where: { id: 'default' },
    });

    if (record) {
      const upperSymbol = symbol.toUpperCase();
      const classes: AssetClass[] = assetClass
        ? [assetClass]
        : ['crypto', 'stocks', 'metals', 'bonds'];

      for (const cls of classes) {
        const logos =
          cls === 'crypto'
            ? (record.cryptoLogos as AssetLogosMap)
            : cls === 'stocks'
              ? (record.stockLogos as AssetLogosMap)
              : cls === 'metals'
                ? (record.metalLogos as AssetLogosMap)
                : (record.bondLogos as AssetLogosMap);

        if (logos[upperSymbol]) {
          return logos[upperSymbol];
        }
      }
    }
  } catch (error) {
    console.error('[AssetLogos] Failed to lookup symbol:', error);
  }

  return null;
}

/**
 * Add or update a custom logo (admin only)
 */
export async function updateLogo(
  symbol: string,
  assetClass: AssetClass,
  logoInfo: AssetLogoInfo
): Promise<boolean> {
  try {
    const record = await prisma.assetLogos.findUnique({
      where: { id: 'default' },
    });

    if (!record) {
      return false;
    }

    const upperSymbol = symbol.toUpperCase();
    const updateField =
      assetClass === 'crypto'
        ? 'cryptoLogos'
        : assetClass === 'stocks'
          ? 'stockLogos'
          : assetClass === 'metals'
            ? 'metalLogos'
            : 'bondLogos';

    const currentLogos = record[updateField] as AssetLogosMap;
    const updatedLogos = {
      ...currentLogos,
      [upperSymbol]: logoInfo,
    };

    await prisma.assetLogos.update({
      where: { id: 'default' },
      data: {
        [updateField]: updatedLogos,
        lastUpdated: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('[AssetLogos] Failed to update logo:', error);
    return false;
  }
}

/**
 * Bulk update logos (admin only)
 */
export async function bulkUpdateLogos(
  assetClass: AssetClass,
  logos: AssetLogosMap
): Promise<boolean> {
  try {
    const updateField =
      assetClass === 'crypto'
        ? 'cryptoLogos'
        : assetClass === 'stocks'
          ? 'stockLogos'
          : assetClass === 'metals'
            ? 'metalLogos'
            : 'bondLogos';

    await prisma.assetLogos.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        cryptoLogos: assetClass === 'crypto' ? logos : CRYPTO_LOGOS,
        stockLogos: assetClass === 'stocks' ? logos : STOCK_LOGOS,
        metalLogos: assetClass === 'metals' ? logos : METAL_LOGOS,
        bondLogos: assetClass === 'bonds' ? logos : BOND_LOGOS,
        version: SCHEMA_VERSION,
      },
      update: {
        [updateField]: logos,
        lastUpdated: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('[AssetLogos] Failed to bulk update logos:', error);
    return false;
  }
}

// Re-export utilities
export { getAssetLogoInfo, detectAssetClass };

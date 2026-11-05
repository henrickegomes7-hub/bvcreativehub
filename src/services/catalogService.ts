import { BrandAsset, GraphicTemplate } from '../types';
import { INITIAL_BRAND_ASSETS, INITIAL_TEMPLATES } from './seedData';

const STORAGE_KEYS = {
  BRAND_ASSETS: 'bv_hub_brand_assets_v1',
  TEMPLATES: 'bv_hub_templates_v1',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch (error) {
    console.warn(`Não foi possível carregar ${key} do navegador:`, error);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Não foi possível salvar ${key} no navegador:`, error);
  }
}

export const catalogService = {
  getBrandAssets(): BrandAsset[] {
    const assets = getStored(STORAGE_KEYS.BRAND_ASSETS, INITIAL_BRAND_ASSETS);
    return assets.map((asset) => asset.id === 'asset-001' || asset.id === 'asset-002'
      ? {
          ...asset,
          file_url: '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png',
          preview_url: '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png',
        }
      : asset);
  },

  saveBrandAsset(asset: BrandAsset): void {
    const assets = this.getBrandAssets();
    const index = assets.findIndex((item) => item.id === asset.id);
    if (index >= 0) assets[index] = asset;
    else assets.unshift(asset);
    setStored(STORAGE_KEYS.BRAND_ASSETS, assets);
  },

  incrementAssetDownload(id: string): void {
    const assets = this.getBrandAssets();
    const asset = assets.find((item) => item.id === id);
    if (asset) {
      asset.download_count = (asset.download_count || 0) + 1;
      setStored(STORAGE_KEYS.BRAND_ASSETS, assets);
    }
  },

  getTemplates(): GraphicTemplate[] {
    return getStored(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
  },

  incrementTemplateDownload(id: string): void {
    const templates = this.getTemplates();
    const template = templates.find((item) => item.id === id);
    if (template) {
      template.downloads = (template.downloads || 0) + 1;
      setStored(STORAGE_KEYS.TEMPLATES, templates);
    }
  },
};

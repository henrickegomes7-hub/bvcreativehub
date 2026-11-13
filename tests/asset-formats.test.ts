import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_ASSET_FORMAT,
  FORMAT_CATEGORIES,
  isAssetFormat,
  normalizeAssetFormat,
  requiresCustomAssetSpecs,
} from '../src/constants/assetFormats.js';

test('format catalog has 16 non-empty categories', () => {
  assert.equal(FORMAT_CATEGORIES.length, 16);
  assert.ok(FORMAT_CATEGORIES.every((category) => category.options.length > 0));
});

test('catalog formats and legacy format values are accepted and displayed by name', () => {
  assert.ok(isAssetFormat('Post Instagram Feed (1080×1080 1:1)'));
  assert.ok(isAssetFormat('social_feed'));
  assert.equal(normalizeAssetFormat('social_feed'), 'Post Instagram Feed (1080x1350 4:5)');
  assert.equal(isAssetFormat('not-a-format'), false);
});

test('custom formats require manually entered specifications', () => {
  assert.ok(requiresCustomAssetSpecs(CUSTOM_ASSET_FORMAT));
  assert.ok(requiresCustomAssetSpecs('Dimensão Personalizada'));
  assert.ok(requiresCustomAssetSpecs('Material Não Listado'));
  assert.ok(requiresCustomAssetSpecs('Outro Formato'));
  assert.equal(requiresCustomAssetSpecs('Banner para Site'), false);
});

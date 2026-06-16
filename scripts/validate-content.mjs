import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contentDir = path.join(root, 'content');

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function requireArray(value, file, location) {
  if (!Array.isArray(value)) fail(file, `${location} muss eine Liste sein.`);
  return value;
}

function requireObject(value, file, location) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(file, `${location} muss ein Objekt sein.`);
  return value;
}

function requireString(value, file, location) {
  if (typeof value !== 'string' || value.trim() === '') fail(file, `${location} muss ein nicht-leerer Text sein.`);
  return value;
}

function assertUnique(seen, id, file, location) {
  if (seen.has(id)) fail(file, `ID-Kollision bei "${id}" (${location}).`);
  seen.add(id);
}

async function readJson(lang, file) {
  try {
    return JSON.parse(await fs.readFile(path.join(contentDir, lang, file), 'utf8'));
  } catch (error) {
    fail(`${lang}/${file}`, error instanceof SyntaxError ? 'enthält kein gültiges JSON.' : 'konnte nicht gelesen werden.');
  }
}

function validateItems(items, file, location, itemIds) {
  requireArray(items, file, location).forEach((item, itemIndex) => {
    const itemLocation = `${location}[${itemIndex}]`;
    requireObject(item, file, itemLocation);
    const itemId = requireString(item.id, file, `${itemLocation}.id`);
    requireString(item.label, file, `${itemLocation}.label`);
    if (item.description !== undefined && typeof item.description !== 'string') {
      fail(file, `${itemLocation}.description muss ein Text sein.`);
    }
    assertUnique(itemIds, itemId, file, itemLocation);
  });
}

function validateCategories(categories, lang) {
  const file = `${lang}/categories.json`;
  const categoryIds = new Set();
  const itemIds = new Set();

  requireArray(categories, file, 'root').forEach((category, categoryIndex) => {
    const categoryLocation = `root[${categoryIndex}]`;
    requireObject(category, file, categoryLocation);
    const categoryId = requireString(category.id, file, `${categoryLocation}.id`);
    requireString(category.title, file, `${categoryLocation}.title`);
    assertUnique(categoryIds, categoryId, file, categoryLocation);

    if (Array.isArray(category.items)) {
      validateItems(category.items, file, `${categoryLocation}.items`, itemIds);
      return;
    }

    const groupIds = new Set();
    requireArray(category.groups, file, `${categoryLocation}.groups`).forEach((group, groupIndex) => {
      const groupLocation = `${categoryLocation}.groups[${groupIndex}]`;
      requireObject(group, file, groupLocation);
      const groupId = requireString(group.id, file, `${groupLocation}.id`);
      requireString(group.title, file, `${groupLocation}.title`);
      assertUnique(groupIds, groupId, file, groupLocation);
      validateItems(group.items, file, `${groupLocation}.items`, itemIds);
    });
  });

  return categoryIds;
}

function validateScales(scales, lang) {
  const file = `${lang}/scales.json`;
  const scaleIds = new Set();

  requireArray(scales, file, 'root').forEach((scale, scaleIndex) => {
    const scaleLocation = `root[${scaleIndex}]`;
    requireObject(scale, file, scaleLocation);
    const scaleId = requireString(scale.id, file, `${scaleLocation}.id`);
    requireString(scale.label, file, `${scaleLocation}.label`);
    assertUnique(scaleIds, scaleId, file, scaleLocation);

    switch (requireString(scale.kind, file, `${scaleLocation}.kind`)) {
      case 'verbal':
        requireArray(scale.labels, file, `${scaleLocation}.labels`).forEach((label, labelIndex) => {
          requireString(label, file, `${scaleLocation}.labels[${labelIndex}]`);
        });
        break;
      case 'numeric':
        if (
          typeof scale.defaultMin !== 'number' ||
          typeof scale.defaultMax !== 'number' ||
          typeof scale.minLimit !== 'number' ||
          typeof scale.maxLimit !== 'number' ||
          !Number.isInteger(scale.maxSteps) ||
          scale.maxSteps < 2 ||
          scale.minLimit > scale.defaultMin ||
          scale.defaultMin >= scale.defaultMax ||
          scale.defaultMax > scale.maxLimit ||
          scale.defaultMax - scale.defaultMin + 1 > scale.maxSteps
        ) {
          fail(file, `${scaleLocation} benötigt gültige numeric-Grenzen: minLimit <= defaultMin < defaultMax <= maxLimit und maxSteps >= Anzahl Stufen.`);
        }
        break;
      case 'symbol':
        requireArray(scale.set, file, `${scaleLocation}.set`).forEach((label, labelIndex) => {
          requireString(label, file, `${scaleLocation}.set[${labelIndex}]`);
        });
        break;
      case 'traffic':
        requireArray(scale.colors, file, `${scaleLocation}.colors`).forEach((color, colorIndex) => {
          requireString(color, file, `${scaleLocation}.colors[${colorIndex}]`);
        });
        break;
      case 'percent':
        break;
      default:
        fail(file, `${scaleLocation}.kind ist unbekannt.`);
    }
  });
}

function validateProductFormats(data, baseCategoryIds, lang) {
  const file = `${lang}/product-formats.json`;
  requireObject(data, file, 'root');
  const groupIds = new Set();
  const formatIds = new Set(baseCategoryIds);

  requireArray(data.groups, file, 'root.groups').forEach((group, groupIndex) => {
    const groupLocation = `root.groups[${groupIndex}]`;
    requireObject(group, file, groupLocation);
    const groupId = requireString(group.id, file, `${groupLocation}.id`);
    requireString(group.title, file, `${groupLocation}.title`);
    assertUnique(groupIds, groupId, file, groupLocation);

    requireArray(group.formats, file, `${groupLocation}.formats`).forEach((format, formatIndex) => {
      const formatLocation = `${groupLocation}.formats[${formatIndex}]`;
      requireObject(format, file, formatLocation);
      const formatId = requireString(format.id, file, `${formatLocation}.id`);
      requireString(format.title, file, `${formatLocation}.title`);
      assertUnique(formatIds, formatId, file, formatLocation);

      const criterionIds = new Set();
      requireArray(format.criteria, file, `${formatLocation}.criteria`).forEach((criterion, criterionIndex) => {
        const criterionLocation = `${formatLocation}.criteria[${criterionIndex}]`;
        requireObject(criterion, file, criterionLocation);
        const criterionId = requireString(criterion.id, file, `${criterionLocation}.id`);
        requireString(criterion.label, file, `${criterionLocation}.label`);
        if (criterion.description !== undefined && typeof criterion.description !== 'string') {
          fail(file, `${criterionLocation}.description muss ein Text sein.`);
        }
        assertUnique(criterionIds, criterionId, file, criterionLocation);
      });
    });
  });
}

const languages = ['de', 'en', 'fr', 'es', 'nl'];

for (const lang of languages) {
  const categories = await readJson(lang, 'categories.json');
  const scales = await readJson(lang, 'scales.json');
  const productFormats = await readJson(lang, 'product-formats.json');

  const categoryIds = validateCategories(categories, lang);
  validateScales(scales, lang);
  validateProductFormats(productFormats, categoryIds, lang);

  console.log(`Content-JSON für '${lang}' ist gültig und kollisionsfrei.`);
}

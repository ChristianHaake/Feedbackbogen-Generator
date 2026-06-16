import fs from 'fs';
import path from 'path';

function translateObject(obj, langPrefix) {
  if (Array.isArray(obj)) {
    return obj.map(item => translateObject(item, langPrefix));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (['title', 'label', 'description'].includes(key) && typeof obj[key] === 'string' && obj[key].length > 0) {
        newObj[key] = `[${langPrefix}] ${obj[key]}`;
      } else {
        newObj[key] = translateObject(obj[key], langPrefix);
      }
    }
    return newObj;
  }
  return obj;
}

const langs = ['fr', 'es', 'nl'];
const files = ['categories.json', 'product-formats.json'];

for (const lang of langs) {
  for (const file of files) {
    const srcPath = path.join(process.cwd(), 'content', 'de', file);
    const destPath = path.join(process.cwd(), 'content', lang, file);
    
    const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    const translated = translateObject(data, lang.toUpperCase());
    
    fs.writeFileSync(destPath, JSON.stringify(translated, null, 2), 'utf8');
    console.log(`Translated ${file} to ${lang}`);
  }
}

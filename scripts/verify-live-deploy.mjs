import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const liveUrl = new URL(process.env.LIVE_URL ?? 'https://fbg.haak3.de');
const failures = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  console.log(`OK ${message}`);
}

function normalizePathname(pathname) {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function hasHtmlFallback(body) {
  return /^\s*<!doctype html/i.test(body) || /<html[\s>]/i.test(body);
}

function includesAll(value, parts) {
  const lower = value.toLowerCase();
  return parts.every((part) => lower.includes(part.toLowerCase()));
}

async function readDistIndex() {
  try {
    return await fs.readFile(path.join(repoRoot, 'dist', 'index.html'), 'utf8');
  } catch (error) {
    throw new Error(
      `Cannot read dist/index.html. Run npm run build before verify:live. ${error.message}`
    );
  }
}

async function request(pathname) {
  const url = new URL(normalizePathname(pathname), liveUrl);
  return fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}

async function readText(pathname) {
  const response = await request(pathname);
  const body = await response.text();
  return { response, body };
}

function extractAssetRefs(indexHtml) {
  const refs = new Set();
  for (const match of indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^\/assets\/.+\.(js|css)$/.test(ref)) refs.add(ref);
  }
  return [...refs];
}

function checkHeader(headers, name, description = name) {
  const value = headers.get(name);
  if (!value) fail(`Missing ${description} header on /`);
  return value ?? '';
}

function checkRootHeaders(headers) {
  const csp = checkHeader(headers, 'content-security-policy', 'CSP');
  checkHeader(headers, 'strict-transport-security', 'HSTS');
  checkHeader(headers, 'x-frame-options');
  checkHeader(headers, 'cross-origin-opener-policy', 'COOP');
  checkHeader(headers, 'cross-origin-resource-policy', 'CORP');
  checkHeader(headers, 'permissions-policy');

  const nosniff = checkHeader(headers, 'x-content-type-options');
  if (nosniff && nosniff.toLowerCase() !== 'nosniff') {
    fail(`Unexpected X-Content-Type-Options on /: ${nosniff}`);
  }

  if (csp) {
    const requiredCspParts = [
      "default-src 'self'",
      "base-uri 'none'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' https://static.cloudflareinsights.com",
      "style-src 'self'",
      "worker-src 'self'",
    ];
    for (const part of requiredCspParts) {
      if (!csp.includes(part)) fail(`CSP missing directive: ${part}`);
    }
  }

  const cacheControl = headers.get('cache-control') ?? '';
  if (!includesAll(cacheControl, ['max-age=0', 'must-revalidate'])) {
    fail(`Unexpected Cache-Control on /: ${cacheControl || '<missing>'}`);
  }
}

async function checkLiveIndex(distIndexHtml) {
  const failureCount = failures.length;
  const assetRefs = extractAssetRefs(distIndexHtml);
  if (assetRefs.length === 0) {
    fail('dist/index.html contains no /assets/*.js or /assets/*.css refs');
    return;
  }

  const { response, body } = await readText('/');
  if (response.status !== 200) fail(`GET / returned ${response.status}`);
  checkRootHeaders(response.headers);

  for (const ref of assetRefs) {
    if (!body.includes(ref)) fail(`Live / does not reference current asset ${ref}`);
  }

  if (failures.length === failureCount) {
    ok(`live index references ${assetRefs.length} current built assets`);
  }
}

async function checkJson(pathname) {
  const { response, body } = await readText(pathname);
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status !== 200) fail(`GET ${pathname} returned ${response.status}`);
  if (hasHtmlFallback(body)) fail(`${pathname} returned HTML fallback`);
  if (contentType.toLowerCase().includes('text/html')) {
    fail(`${pathname} has HTML content type: ${contentType}`);
  }
  try {
    JSON.parse(body);
  } catch (error) {
    fail(`${pathname} is not valid JSON: ${error.message}`);
  }
  checkNoCache(pathname, response.headers);
}

async function checkTextAsset(pathname, expectedText) {
  const { response, body } = await readText(pathname);
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status !== 200) fail(`GET ${pathname} returned ${response.status}`);
  if (hasHtmlFallback(body)) fail(`${pathname} returned HTML fallback`);
  if (contentType.toLowerCase().includes('text/html')) {
    fail(`${pathname} has HTML content type: ${contentType}`);
  }
  if (!body.includes(expectedText)) fail(`${pathname} does not contain ${expectedText}`);
  checkNoCache(pathname, response.headers);
}

function checkNoCache(pathname, headers) {
  const cacheControl = headers.get('cache-control') ?? '';
  if (!includesAll(cacheControl, ['max-age=0', 'must-revalidate'])) {
    fail(`Unexpected Cache-Control on ${pathname}: ${cacheControl || '<missing>'}`);
  }
}

async function checkAssets() {
  const failureCount = failures.length;
  await checkJson('/content/de/categories.json');
  await checkJson('/content/de/scales.json');
  await checkJson('/content/de/product-formats.json');
  await checkTextAsset('/sw.js', 'precacheAndRoute');
  await checkTextAsset('/registerSW.js', 'serviceWorker');
  await checkJson('/manifest.webmanifest');
  if (failures.length === failureCount) {
    ok('content, service worker, registration script, and manifest are live assets');
  }
}

async function main() {
  console.log(`Verifying live deploy at ${liveUrl.href}`);
  const distIndexHtml = await readDistIndex();
  await checkLiveIndex(distIndexHtml);
  await checkAssets();

  if (failures.length > 0) {
    console.error('\nLive deploy verification failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nLive deploy verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

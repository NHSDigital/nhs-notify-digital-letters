import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import https from "https";
import http from "http";
import { URL } from "url";

/**
 * Shared schema cache for HTTP-fetched external schemas.
 *
 * This cache is used by both generate-example.ts and manual-bundle-schema.ts
 * to avoid redundant HTTP requests when processing multiple schemas.
 *
 * The cache uses a two-tier approach:
 * 1. In-memory cache (fast, but temporary)
 * 2. File system cache (persistent, but slower)
 */

// Persistent cache directory for external schemas
export const CACHE_DIR = process.env.SCHEMA_CACHE_DIR || path.join(os.tmpdir(), 'nhs-notify-schema-cache');
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache
interface MemoryCacheEntry {
  content: string;
  timestamp: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`[CACHE] Created cache directory: ${CACHE_DIR}`);
}

/**
 * Generate a cache key from a URL
 */
function getCacheKey(url: string): string {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return `${hash}.json`;
}

/**
 * Fetch schema from HTTP with retry logic and exponential backoff
 */
async function fetchSchemaWithRetry(uri: string, maxRetries = 10): Promise<string> {
  const maxRedirects = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Calculate exponential backoff: 0ms, 100ms, 200ms, 400ms, 800ms, 1600ms, etc.
      if (attempt > 0) {
        const backoffMs = Math.min(100 * Math.pow(2, attempt - 1), 5000);
        console.log(`[FETCH] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms backoff`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.log(`[FETCH] Fetching schema from ${uri} (attempt ${attempt + 1}/${maxRetries})`);
      }

      const content = await fetchUrlWithRedirects(uri, maxRedirects);
      console.log(`[FETCH] ✓ Successfully fetched schema from ${uri}`);
      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[FETCH] Attempt ${attempt + 1}/${maxRetries} failed for ${uri}: ${lastError.message}`);

      // Don't retry on certain errors
      if (lastError.message.includes('404') ||
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('415') ||  // Unsupported Media Type
          lastError.message.includes('422') ||  // Unprocessable Entity
          lastError.message.includes('502') ||  // Bad Gateway
          lastError.message.includes('Failed to parse JSON')) {  // JSON parse errors
        console.error(`[FETCH] ✗ Non-retryable error (${lastError.message}), aborting retries`);
        break;
      }
    }
  }

  const errorMsg = `Failed to fetch schema from ${uri} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`;
  console.error(`[FETCH] ✗ ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * Fetch URL with redirect handling
 */
async function fetchUrlWithRedirects(uri: string, maxRedirects: number): Promise<string> {
  let redirectCount = 0;
  let currentUri = uri;

  while (true) {
    const result = await fetchUrl(currentUri);

    // Check if it's a redirect
    if (result.redirect) {
      if (redirectCount >= maxRedirects) {
        throw new Error(`Too many redirects (${maxRedirects}) when fetching ${uri}`);
      }

      redirectCount++;
      console.log(`[FETCH] Following redirect ${result.statusCode}: ${currentUri} -> ${result.redirect}`);
      currentUri = result.redirect;
      continue;
    }

    // Success - return the content
    return result.content;
  }
}

/**
 * Fetch a single URL
 */
function fetchUrl(uri: string): Promise<{ content: string; redirect?: string; statusCode?: number }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(uri);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'nhs-notify-schema-cache/1.0',
        'Accept': 'application/json, application/schema+json, */*'
      }
    };

    const req = protocol.get(options, (res) => {
      const statusCode = res.statusCode || 0;

      // Handle redirects
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;

        // Handle relative redirects
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, uri).href;
        }

        resolve({ content: '', redirect: redirectUrl, statusCode });
        return;
      }

      // Handle non-200 responses
      if (statusCode !== 200) {
        reject(new Error(`HTTP ${statusCode} when fetching ${uri}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Validate it's valid JSON
          JSON.parse(data);
          resolve({ content: data });
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${uri}: ${error instanceof Error ? error.message : error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error when fetching ${uri}: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout (10s) when fetching ${uri}`));
    });
  });
}

/**
 * Get cached schema if available and not expired
 * Checks memory cache first, then file system cache, then fetches from HTTP
 * If cache is expired, automatically refetches from HTTP
 */
export async function getCachedSchema(url: string): Promise<string | null> {
  const cacheKey = getCacheKey(url);
  let needsRefetch = false;

  // Check memory cache first
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry) {
    const age = Date.now() - memEntry.timestamp;
    if (age <= CACHE_MAX_AGE_MS) {
      console.log(`[CACHE] ✓ Memory cache HIT for ${url} (age: ${Math.round(age/1000/60)} minutes)`);
      return memEntry.content;
    } else {
      // Expired from memory cache - need to refetch
      console.log(`[CACHE] Memory cache expired for ${url} (age: ${Math.round(age/1000/60)} minutes) - will refetch`);
      memoryCache.delete(cacheKey);
      needsRefetch = true;
    }
  }

  // Check file system cache if not already determined to be expired
  if (!needsRefetch) {
    const cacheFile = path.join(CACHE_DIR, cacheKey);

    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        const age = Date.now() - stats.mtimeMs;

        if (age <= CACHE_MAX_AGE_MS) {
          const content = fs.readFileSync(cacheFile, 'utf-8');
          console.log(`[CACHE] ✓ File cache HIT for ${url} (age: ${Math.round(age/1000/60)} minutes)`);

          // Store in memory cache for faster subsequent access
          memoryCache.set(cacheKey, {
            content,
            timestamp: stats.mtimeMs
          });

          return content;
        } else {
          // Expired from file system cache - need to refetch
          console.log(`[CACHE] File cache expired for ${url} (age: ${Math.round(age/1000/60)} minutes) - will refetch`);
          fs.unlinkSync(cacheFile);
          needsRefetch = true;
        }
      } catch (err) {
        console.warn(`[CACHE] Error reading cache for ${url}:`, err);
        needsRefetch = true;
      }
    }
  }

  // Cache miss or expired - fetch from HTTP
  if (needsRefetch) {
    console.log(`[CACHE] Cache expired for ${url}, refetching from source`);
  } else {
    console.log(`[CACHE] ✗ Cache MISS for ${url}`);
  }

  try {
    const content = await fetchSchemaWithRetry(url);

    // Store in both caches
    setCachedSchema(url, content);

    // Tell the client it's now cached (available as a cache hit for next request)
    console.log(`[CACHE] ✓ Schema fetched and cached successfully for ${url}`);

    return content;
  } catch (error) {
    console.error(`[CACHE] Failed to fetch schema from ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Store schema in cache (both memory and file system)
 */
export function setCachedSchema(url: string, content: string): void {
  const cacheKey = getCacheKey(url);
  const cacheFile = path.join(CACHE_DIR, cacheKey);

  try {
    // Write to file system
    fs.writeFileSync(cacheFile, content, 'utf-8');
    console.log(`[CACHE] ✓ Cached schema from ${url}`);

    // Store in memory cache for immediate access
    memoryCache.set(cacheKey, {
      content,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn(`[CACHE] Error writing cache for ${url}:`, err);
  }
}

/**
 * Clear all cached schemas (both memory and file system)
 */
export function clearCache(): number {
  console.log(`[CACHE] Clearing cache directory: ${CACHE_DIR}`);

  // Clear memory cache
  const memorySize = memoryCache.size;
  memoryCache.clear();
  console.log(`[CACHE] ✓ Cleared ${memorySize} memory cache entry(ies)`);

  // Clear file system cache
  if (!fs.existsSync(CACHE_DIR)) {
    console.log(`[CACHE] Cache directory does not exist`);
    return 0;
  }

  const files = fs.readdirSync(CACHE_DIR);
  let cleared = 0;
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      cleared++;
    }
  }
  console.log(`[CACHE] ✓ Cleared ${cleared} file system cached schema(s)`);
  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheInfo(): {
  directory: string;
  maxAgeHours: number;
  count: number;
  memoryCount: number;
  entries: Array<{ file: string; ageMinutes: number; expired: boolean }>;
} {
  const entries: Array<{ file: string; ageMinutes: number; expired: boolean }> = [];

  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;
      const ageMinutes = Math.round(age / 1000 / 60);
      const expired = age > CACHE_MAX_AGE_MS;

      entries.push({ file, ageMinutes, expired });
    }
  }

  return {
    directory: CACHE_DIR,
    maxAgeHours: CACHE_MAX_AGE_MS / 1000 / 60 / 60,
    count: entries.length,
    memoryCount: memoryCache.size,
    entries
  };
}

/**
 * Display cache information
 */
export function displayCacheInfo(): void {
  const info = getCacheInfo();

  console.log(`[CACHE] Cache directory: ${info.directory}`);
  console.log(`[CACHE] Cache max age: ${info.maxAgeHours} hours`);
  console.log(`[CACHE] Memory cached schemas: ${info.memoryCount}`);
  console.log(`[CACHE] File system cached schemas: ${info.count}`);

  if (info.entries.length > 0) {
    console.log(`[CACHE] Cache entries:`);
    for (const entry of info.entries) {
      const expiredTag = entry.expired ? ' (EXPIRED)' : '';
      console.log(`[CACHE]   - ${entry.file}: ${entry.ageMinutes} minutes old${expiredTag}`);
    }
  }
}

# Schema Cache

The schema tools (`generate-example.ts`, `manual-bundle-schema.ts`, `validate.js`, and `generate-docs.cjs`) share a persistent file-based cache for external HTTP schema references.

## How It Works

When any of these tools fetch external schemas (e.g., from `https://notify.nhs.uk/...` or `https://raw.githubusercontent.com/...`), the cache:

1. **Checks the cache** first before making network requests
2. **Stores fetched schemas** in a cache directory for 24 hours
3. **Reuses cached schemas** across multiple script invocations and different tools
4. **Shares the cache** between all schema tools in this workspace

This dramatically reduces build times when generating multiple example events, bundled schemas, validating data, or generating documentation, as each external schema only needs to be fetched once per day.

## Cache Location

By default, cached schemas are stored in:

- **Linux/macOS**: `/tmp/nhs-notify-schema-cache/`
- **Windows**: `%TEMP%\nhs-notify-schema-cache\`

You can customize the location with the `SCHEMA_CACHE_DIR` environment variable:

```bash
export SCHEMA_CACHE_DIR=/path/to/custom/cache
```

## Cache Management

### View Cache Info

```bash
cd src/cloudevents

# Via generate-example
npm run generate -- --cache-info

# Or via bundle script
npm run bundle -- --cache-info
```

This displays:

- Cache directory location
- Number of cached schemas
- Age of each cached schema
- Which schemas are expired

### Clear Cache

To force fresh downloads of all external schemas:

```bash
cd src/cloudevents

# Via generate-example
npm run generate -- --clear-cache

# Or via bundle script
npm run bundle -- --clear-cache
```

Or manually delete the cache directory:

```bash
rm -rf /tmp/nhs-notify-schema-cache
```

## Cache Behavior

- **Max Age**: 24 hours (configurable via `CACHE_MAX_AGE_MS` in the script)
- **Automatic Cleanup**: Expired schemas are deleted on next access
- **Cache Key**: SHA-256 hash of the schema URL
- **Format**: Raw JSON response stored as `.json` files

## When to Clear Cache

Clear the cache when:

- External schemas have been updated
- You're troubleshooting schema resolution issues
- You want to ensure you have the latest versions

## Performance Impact

**Without cache** (first run or after clearing):

- Each external schema fetched via HTTPS
- ~1-3 seconds per external reference
- Multiplied by number of event schemas being generated

**With cache** (subsequent runs):

- Schemas loaded from local disk
- <10ms per external reference
- 100x+ faster for builds generating many examples

## CI/CD Considerations

In CI/CD pipelines:

- The cache starts empty on each build (clean environment)
- First execution populates the cache
- Subsequent steps in the same build benefit from the cache
- Consider Pre-populating cache in early build step if beneficial

You can persist cache between CI runs by:

1. Using CI cache features (GitHub Actions cache, GitLab cache, etc.)
2. Caching the `SCHEMA_CACHE_DIR` directory
3. Setting appropriate cache keys based on schema versions

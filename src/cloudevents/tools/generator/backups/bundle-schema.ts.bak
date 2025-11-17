import $RefParser from 'json-schema-ref-parser';
import fs from 'fs';
import path from 'path';

/*
 * bundle-schema.ts
 * -----------------
 * Produces a single self-contained JSON Schema document with all $ref
 * resolutions inlined (using json-schema-ref-parser's bundle capability).
 *
 * Why both bundle & dereference?  We choose bundle here so that:
 *  - Internal circular references are preserved (if any)
 *  - Definitions ($defs) are kept rather than fully duplicated
 *  - External file references are pulled into the root schema's $defs
 *
 * Usage:
 *   npx ts-node bundle-schema.ts <entry-schema> <output-file>
 * or via npm script:
 *   npm run bundle -- nhs-notify-example-event.schema.json dist/nhs-notify-example-event.bundle.schema.json
 */

async function main() {
  const args = process.argv.slice(2);
  let flatten = false;
  let rootDir: string | undefined;
  const filtered: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--flatten' || a === '--flatten-allof') {
      flatten = true;
    } else if (a === '--root-dir' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++; // Skip the next argument as it's the root dir value
    } else {
      filtered.push(a);
    }
  }

  const [entry, outFile] = filtered;
  if (!entry || !outFile) {
    console.error('Usage: ts-node bundle-schema.ts [--flatten] [--root-dir <path>] <entry-schema.json|yaml> <output-file.json>');
    process.exit(1);
  }

  // Accept relative paths; keep original relative for nicer $ref roots
  const entryPath = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry);
  if (!fs.existsSync(entryPath)) {
    console.error(`Entry schema not found: ${entryPath}`);
    process.exit(1);
  }

  try {
    // Use bundle (not dereference) to keep shared $defs only once.
    // Only resolve local file references, leave remote URLs as-is
    let bundled;
    try {
      bundled = await $RefParser.bundle(entryPath, {
        resolve: {
          file: { order: 1 },
          // Disable http resolver completely
          http: false
        },
        dereference: {
          circular: 'ignore'
        }
      });
    } catch (error: any) {
      // If bundling fails due to unresolvable remote references,
      // fall back to just parsing the schema without bundling
      console.warn(`Warning: Could not bundle all references (${error.message}). Using unbundled schema.`);
      bundled = await $RefParser.parse(entryPath);
    }

    // Set $id to match the output file's relative path from output root
    // This matches how build-schema.ts calculates $id for modular schemas
    if (typeof bundled === 'object' && bundled) {
      // Calculate relative path from output root (or current working directory if not in output/)
      const outFileAbs = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);

      // Use provided root directory or fall back to current working directory
      const repoRoot = rootDir ? path.resolve(rootDir) : process.cwd();
      const outputRoot = path.join(repoRoot, 'output');

      let schemaId: string;

      if (outFileAbs.startsWith(outputRoot)) {
        // Output file is in output/ - use relative path from output root with leading /
        // This allows relative $refs to resolve correctly in AJV
        schemaId = "/" + path.relative(outputRoot, outFileAbs).replace(/\\/g, '/');
      } else if (outFileAbs.includes('/schemas/')) {
        // Output file is in schemas/ (published) - might have base URL, use relative from schemas root
        const schemasRoot = path.join(repoRoot, 'schemas');
        const relativePath = path.relative(schemasRoot, outFileAbs).replace(/\\/g, '/');
        schemaId = `https://notify.nhs.uk/cloudevents/schemas/${relativePath}`;
      } else {
        // Fallback: use basename
        schemaId = path.basename(outFile);
      }

      (bundled as any).$id = schemaId;
      (bundled as any).$comment = ((bundled as any).$comment ? (bundled as any).$comment + ' | ' : '') + 'Bundled schema (all external $ref inlined).';

      // Strip nested $id fields to avoid AJV treating sub-schemas as separate roots and breaking local $ref resolution.
      const root = bundled as any;
      const rootId = root.$id;
      const seen = new Set<object>();
      function cleanse(node: any) {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (node !== root && typeof node.$id === 'string') {
          // Drop nested $id to keep all refs inside single document coordinate space
          delete node.$id;
        }
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (typeof val === 'object') cleanse(val);
        }
      }
      cleanse(root);

  // Rewrite any refs that json-schema-ref-parser emitted pointing deep via encoded path segments
      // Example currently causing issue: "#/allOf/0/properties/data/properties/notify-payload/%24defs/DataPlane"
      // We can detect pattern /notify-payload/%24defs/... and map to a top-level unique path in $defs.
      // For simplicity, if root.$defs does not have these, we hoist them.
      if (!root.$defs) root.$defs = {};
      // Hoist DataPlane & ControlPlane if they exist under notify-payload.$defs
      try {
        const dataPlane = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.$defs?.DataPlane;
        const controlPlane = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.$defs?.ControlPlane;
        if (dataPlane) root.$defs.DataPlane = dataPlane;
        if (controlPlane) root.$defs.ControlPlane = controlPlane;
      } catch {}
      // Hoist notify-metadata nested $defs (e.g., commitSha, uuid, sha256prefixed) so flattened refs resolve
      try {
        const metaDefs = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.properties?.['notify-metadata']?.$defs;
        if (metaDefs && typeof metaDefs === 'object') {
          for (const [k,v] of Object.entries(metaDefs)) {
            if (!(k in root.$defs)) {
              root.$defs[k] = v;
            }
          }
        }
      } catch {}
      function rewriteRefs(node: any) {
        if (!node || typeof node !== 'object') return;
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (key === '$ref' && typeof val === 'string') {
            const match = val.match(/#\/allOf\/0\/properties\/data\/properties\/notify-payload\/%24defs\/(DataPlane|ControlPlane)$/);
            if (match) {
              node[key] = `#/$defs/${match[1]}`;
            }
            const metaMatch = val.match(/#\/allOf\/0\/properties\/data\/properties\/notify-payload\/properties\/notify-metadata\/%24defs\/(commitSha|uuid|sha256prefixed)/);
            if (metaMatch) {
              node[key] = `#/$defs/${metaMatch[1]}`;
            }
          } else if (typeof val === 'object') {
            rewriteRefs(val);
          }
        }
      }
      rewriteRefs(root);

      // Optionally flatten top-level allOf object schemas (merge properties/required/etc) while preserving conditional subschemas.
      if (flatten && Array.isArray(root.allOf)) {
        const imported: any[] = [];
        const carry: any[] = [];
        for (const seg of root.allOf) {
          if (seg && typeof seg === 'object' && !('$ref' in seg) && (seg.properties || seg.required || seg.allOf)) {
            imported.push(seg);
          } else {
            carry.push(seg);
          }
        }

        const mergePropertySchemas = (a: any, b: any) => {
          // If either references or uses complex keywords, fallback to allOf
          const complexKeys = ['oneOf','anyOf','not','if','then','else','$ref'];
            if (complexKeys.some(k => k in a) || complexKeys.some(k => k in b)) {
              return { allOf: [a, b] };
            }
          const out: any = { ...a };
          const mergeSimple = (key: string) => {
            if (b[key] === undefined) return;
            if (out[key] === undefined) { out[key] = b[key]; return; }
            if (key === 'description') {
              if (out.description !== b.description) {
                out.description = out.description + ' | ' + b.description;
              }
              return;
            }
            if (key === 'examples' && Array.isArray(out.examples) && Array.isArray(b.examples)) {
              const set = new Set([...out.examples, ...b.examples]);
              out.examples = Array.from(set);
              return;
            }
            if (key === 'enum' && Array.isArray(out.enum) && Array.isArray(b.enum)) {
              const intersect = out.enum.filter((v: any) => b.enum.includes(v));
              out.enum = intersect;
              if (intersect.length === 1) { out.const = intersect[0]; delete out.enum; }
              return;
            }
            if (key === 'pattern' && a.pattern !== b.pattern) {
              if (!out.const) {
                const originalDesc = a.description ? `Original pattern: ${a.description}` : 'Original pattern constraint';
                const incomingDesc = b.description ? `Merged pattern: ${b.description}` : 'Merged pattern constraint';
                const keepA = { type: 'string', pattern: a.pattern, description: originalDesc };
                const keepB = { type: 'string', pattern: b.pattern, description: incomingDesc };
                delete out.pattern;
                out.allOf = (out.allOf || []).concat([keepA, keepB]);
              }
              return;
            }
            if (key === 'const') {
              if (out.const !== b.const) {
                // Conflict - unsatisfiable; record both in allOf to surface failure during validation
                return { allOf: [a, b] };
              }
              return;
            }
            // For other scalar merge attempts, prefer existing (more specific) and ignore broader.
          };
          for (const k of Object.keys(b)) mergeSimple(k);
          return out;
        };

        // Root accumulators
        root.properties = root.properties || {};
        root.required = Array.isArray(root.required) ? root.required : [];
        const requiredSet = new Set(root.required);

        const pushRequired = (req: any) => {
          if (Array.isArray(req)) req.forEach(r => requiredSet.add(r));
        };

        const extraAllOf: any[] = [];

        for (const seg of imported) {
          // Merge simple top-level facets
          pushRequired(seg.required);
          if (seg.properties) {
            for (const [pName, pSchema] of Object.entries<any>(seg.properties)) {
              if (!(pName in root.properties)) {
                root.properties[pName] = pSchema;
              } else {
                const merged = mergePropertySchemas(root.properties[pName], pSchema);
                root.properties[pName] = merged;
              }
            }
          }
          // Hoist nested allOf entries (e.g., conditional logic) to carry list
          if (Array.isArray(seg.allOf)) {
            for (const sub of seg.allOf) extraAllOf.push(sub);
          }
        }
        root.required = Array.from(requiredSet);
        const newAllOf = [...carry, ...extraAllOf].filter(Boolean);
        if (newAllOf.length > 0) root.allOf = newAllOf; else delete root.allOf;
      }
    }

    const outDir = path.dirname(path.resolve(outFile));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(bundled, null, 2));
    console.log(`Bundled schema written to ${outFile}`);
  } catch (err) {
    console.error('Failed to bundle schema:', err);
    process.exit(1);
  }
}

main();

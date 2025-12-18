import $RefParser from 'json-schema-ref-parser';
import fs from 'fs';
import path from 'path';

/*
 * bundle-schema-prefer-child.ts
 * ---------------------------------
 * Variant of bundle-schema.ts that, when optionally flattening a top-level allOf,
 * merges duplicate properties by taking the MOST SPECIFIC (deepest / later) child
 * schema while still accumulating/merging restrictive constraints from ancestors.
 *
 * Specificity heuristics:
 *  - Later allOf segment wins for core shape (type/properties/items) unless conflict.
 *  - String patterns from multiple levels are combined (AND) via allOf pattern wrappers.
 *  - Numeric range constraints (minimum/maximum/exclusive*) are tightened (intersection).
 *  - enum/const: child const wins; enum intersected; if intersection single value -> const.
 *  - required: union of all required arrays encountered.
 *  - object properties: recursively merged with same prefer-child semantics.
 *  - On irreconcilable conflicts (e.g. different incompatible types) an allOf of the
 *    two schemas is produced so that validation naturally fails if unsatisfiable.
 *
 * Usage:
 *   npx ts-node bundle-schema-prefer-child.ts [--flatten] <entry-schema.json> <output-file.json>
 *   npm run bundle:prefer-child -- nhs-notify-example-event.schema.json dist/out.schema.json
 */

async function main() {
  const args = process.argv.slice(2);
  let flatten = false;
  const filtered: string[] = [];
  for (const a of args) {
    if (a === '--flatten' || a === '--flatten-allof') flatten = true; else filtered.push(a);
  }
  const [entry, outFile] = filtered;
  if (!entry || !outFile) {
    console.error('Usage: ts-node bundle-schema-prefer-child.ts [--flatten] <entry-schema.json> <output-file.json>');
    process.exit(1);
  }

  const entryPath = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry);
  if (!fs.existsSync(entryPath)) {
    console.error(`Entry schema not found: ${entryPath}`);
    process.exit(1);
  }

  try {
    const bundled = await $RefParser.bundle(entryPath, {
      resolve: {
        file: { order: 1 },
        http: {
          order: 2,
          headers: {
            'User-Agent': 'nhs-notify-schema-builder/1.0',
            'Accept': 'application/json, application/schema+json, */*'
          }
        }
      },
      dereference: { circular: 'ignore' }
    });

    if (typeof bundled === 'object' && bundled) {
      const baseName = path.basename(outFile);
      const idCandidate = `https://nhsdigital.github.io/nhs-notify-standards/cloudevents/${baseName}`;
      if (!('$id' in bundled) || (bundled as any).$id?.includes('example')) {
        (bundled as any).$id = idCandidate;
      }
      (bundled as any).$comment = ((bundled as any).$comment ? (bundled as any).$comment + ' | ' : '') + 'Bundled schema (prefer-child merge variant).';

      const root = bundled as any;
      const rootId = root.$id;
      const seen = new Set<object>();
      function cleanse(node: any) {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (node !== root && typeof node.$id === 'string') delete node.$id;
        for (const k of Object.keys(node)) {
          const v = node[k];
            if (typeof v === 'object') cleanse(v);
        }
      }
      cleanse(root);

      if (!root.$defs) root.$defs = {};
      try {
        const dataPlane = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.$defs?.DataPlane;
        const controlPlane = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.$defs?.ControlPlane;
        if (dataPlane) root.$defs.DataPlane = dataPlane;
        if (controlPlane) root.$defs.ControlPlane = controlPlane;
      } catch {}
      // Hoist notify-metadata nested $defs if present
      try {
        const metaDefs = root.allOf?.[0]?.properties?.data?.properties?.['notify-payload']?.properties?.['notify-metadata']?.$defs;
        if (metaDefs && typeof metaDefs === 'object') {
          for (const [k,v] of Object.entries(metaDefs)) {
            if (!(k in root.$defs)) root.$defs[k] = v;
          }
        }
      } catch {}
      function rewriteRefs(node: any) {
        if (!node || typeof node !== 'object') return;
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (key === '$ref' && typeof val === 'string') {
            const match = val.match(/#\/allOf\/0\/properties\/data\/properties\/notify-payload\/%24defs\/(DataPlane|ControlPlane)$/);
            if (match) node[key] = `#/$defs/${match[1]}`;
            const metaMatch = val.match(/#\/allOf\/0\/properties\/data\/properties\/notify-payload\/properties\/notify-metadata\/%24defs\/(commitSha|uuid|sha256prefixed)/);
            if (metaMatch) node[key] = `#/$defs/${metaMatch[1]}`;
          } else if (typeof val === 'object') rewriteRefs(val);
        }
      }
      rewriteRefs(root);

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

        // Helpers
        const complexKeys = ['oneOf','anyOf','not','if','then','else','$ref','dependentSchemas'];

        const mergeNumeric = (parent: any, child: any, key: string, pick: (a:number,b:number)=>number, dir: 'min'|'max') => {
          const pv = parent[key];
          const cv = child[key];
          if (pv === undefined && cv === undefined) return;
          if (pv === undefined) return; // already on child
          if (cv === undefined) child[key] = pv; else {
            if (typeof pv === 'number' && typeof cv === 'number') {
              child[key] = pick(pv, cv);
            }
          }
        };

        function schemasConflict(a: any, b: any): boolean {
          if (a.type && b.type) {
            const at = Array.isArray(a.type) ? a.type : [a.type];
            const bt = Array.isArray(b.type) ? b.type : [b.type];
            const inter = at.filter((t: any) => bt.includes(t));
            if (inter.length === 0) return true;
          }
          return false;
        }

        function mergePreferChild(parent: any, child: any): any {
          if (!parent) return child;
          if (!child) return parent;
          if (schemasConflict(parent, child)) {
            return { allOf: [parent, child] }; // incompatible; let validator decide
          }
          // If either is complex, wrap
          if (complexKeys.some(k => k in parent) || complexKeys.some(k => k in child)) {
            // attempt shallow combination by ANDing
            return { allOf: [parent, child] };
          }
          // Start with deep clone of child (prefer-child)
          const out = JSON.parse(JSON.stringify(child));

          // Types: ensure intersection if both have type arrays
            if (parent.type && child.type) {
              const pt = Array.isArray(parent.type) ? parent.type : [parent.type];
              const ct = Array.isArray(child.type) ? child.type : [child.type];
              const inter = ct.filter((t: any) => pt.includes(t));
              if (inter.length === 0) return { allOf: [parent, child] };
              out.type = inter.length === 1 ? inter[0] : inter;
            } else if (parent.type && !child.type) {
              out.type = parent.type;
            }

          // String specifics
          if ((out.type === 'string' || out.type === undefined)) {
            if (parent.pattern && child.pattern && parent.pattern !== child.pattern) {
              // Combine patterns via allOf pattern constraints.
              const constraints: any[] = [];
              constraints.push({ type: 'string', pattern: parent.pattern, description: 'Parent pattern' });
              constraints.push({ type: 'string', pattern: child.pattern, description: 'Child pattern' });
              // keep child.pattern as-is (already in out). Provide extra parent constraint.
              out.allOf = (out.allOf || []).concat(constraints[0]);
            } else if (parent.pattern && !child.pattern) {
              out.pattern = parent.pattern;
            }
            if (parent.minLength !== undefined) out.minLength = Math.max(parent.minLength, out.minLength ?? parent.minLength);
            if (parent.maxLength !== undefined) out.maxLength = out.maxLength === undefined ? parent.maxLength : Math.min(parent.maxLength, out.maxLength);
          }

          // Numeric specifics
          mergeNumeric(parent, out, 'minimum', Math.max, 'min');
          mergeNumeric(parent, out, 'exclusiveMinimum', Math.max, 'min');
          mergeNumeric(parent, out, 'maximum', Math.min, 'max');
          mergeNumeric(parent, out, 'exclusiveMaximum', Math.min, 'max');

          // Enum / const
          if (parent.const !== undefined && out.const === undefined && out.enum === undefined) {
            out.const = parent.const;
          } else if (parent.enum && out.enum) {
            const inter = out.enum.filter((v: any) => parent.enum.includes(v));
            out.enum = inter;
            if (inter.length === 1) { out.const = inter[0]; delete out.enum; }
          } else if (parent.enum && out.const === undefined && out.enum === undefined) {
            out.enum = parent.enum.slice();
          }
          // If parent has const, ensure child const matches or allOf conflict
          if (parent.const !== undefined && out.const !== undefined && parent.const !== out.const) {
            return { allOf: [parent, child] };
          }

          // Object specifics
          if ((out.type === 'object' || out.properties) && (parent.properties || parent.type === 'object')) {
            out.properties = out.properties || {};
            for (const [pName, pSchema] of Object.entries<any>(parent.properties || {})) {
              if (!(pName in out.properties)) {
                out.properties[pName] = pSchema; // parent-only property propagates
              } else {
                out.properties[pName] = mergePreferChild(pSchema, out.properties[pName]);
              }
            }
            // required: union
            const reqSet = new Set<string>([...(parent.required || []), ...(out.required || [])]);
            if (reqSet.size > 0) out.required = Array.from(reqSet);
            // additionalProperties: prefer child, else parent
            if (out.additionalProperties === undefined && parent.additionalProperties !== undefined) {
              out.additionalProperties = parent.additionalProperties;
            }
          }

          return out;
        }

        root.properties = root.properties || {};
        root.required = Array.isArray(root.required) ? root.required : [];
        const requiredSet = new Set(root.required);

        const extraAllOf: any[] = [];

        for (const seg of imported) {
          if (Array.isArray(seg.required)) seg.required.forEach((r: string) => requiredSet.add(r));
          if (seg.properties) {
            for (const [pName, pSchema] of Object.entries<any>(seg.properties)) {
              if (!(pName in root.properties)) {
                root.properties[pName] = pSchema;
              } else {
                root.properties[pName] = mergePreferChild(root.properties[pName], pSchema);
              }
            }
          }
          if (Array.isArray(seg.allOf)) extraAllOf.push(...seg.allOf);
        }
        root.required = Array.from(requiredSet);
        const newAllOf = [...carry, ...extraAllOf].filter(Boolean);
        if (newAllOf.length > 0) root.allOf = newAllOf; else delete root.allOf;
      }
    }

    const outDir = path.dirname(path.resolve(outFile));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(bundled, null, 2));
    console.log(`Bundled (prefer-child) schema written to ${outFile}`);
  } catch (err) {
    console.error('Failed to bundle schema (prefer-child variant):', err);
    process.exit(1);
  }
}

main();

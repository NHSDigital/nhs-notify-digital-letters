/**
 * Generates jest.config.cjs from the individual workspace jest.config.ts files.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'jest.config.cjs');

interface PackageJson {
  workspaces?: string[];
}

const rootPkg = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as PackageJson;

const workspaces: string[] = rootPkg.workspaces ?? [];

/**
 * Inline TypeScript written to a temp .ts file and executed by tsx so each
 * workspace jest.config.ts is evaluated in an isolated Node process with a
 * fresh module registry (preventing shared mutable baseJestConfig state).
 */
const EVALUATOR = (configPath: string): string => `
import config from ${JSON.stringify(configPath)};
process.stdout.write(JSON.stringify(config));
`;

/** Serialise a plain JS value to source code, indented with the given prefix. */
function serialise(value: unknown, indent = '  '): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value
      .map((v) => `${indent}  ${serialise(v, indent + '  ')}`)
      .join(',\n');
    return `[\n${items},\n${indent}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    if (entries.length === 0) return '{}';
    const lines = entries
      .map(
        ([k, v]) =>
          `${indent}  ${JSON.stringify(k)}: ${serialise(v, indent + '  ')}`,
      )
      .join(',\n');
    return `{\n${lines},\n${indent}}`;
  }

  return String(value);
}

// Coverage-related keys that are invalid inside a `projects` entry — they must
// live at the root level only. We strip them from project configs and hoist
// them into the root config instead.
const COVERAGE_PROJECT_KEYS = [
  'collectCoverage',
  'coverageDirectory',
  'coverageProvider',
  'coverageReporters',
  'coverageThreshold',
] as const;

interface ProjectEntry {
  workspace: string;
  config: Record<string, unknown>;
  coverageThreshold: Record<string, unknown> | undefined;
  coverageReporters: string[] | undefined;
}

function main(): void {
  const projects: ProjectEntry[] = [];

  for (const ws of workspaces) {
    const wsDir = path.join(repoRoot, ws);

    const hasCjs = fs.existsSync(path.join(wsDir, 'jest.config.cjs'));
    const hasTs = fs.existsSync(path.join(wsDir, 'jest.config.ts'));

    if (hasCjs && !hasTs) {
      throw new Error(
        `${ws} has jest.config.cjs but no jest.config.ts. ` +
          `Migrate it to jest.config.ts so the generator can handle it uniformly.`,
      );
    }

    if (!hasTs) {
      // No Jest config → no Jest tests (e.g. src/digital-letters-events)
      continue;
    }

    // Evaluate the workspace config in an isolated tsx subprocess so that the
    // shared mutable `baseJestConfig` object is freshly initialised for every
    // workspace. Dynamic import() in the parent process would share the cached
    // module instance and accumulate mutations.
    const configPath = path.join(wsDir, 'jest.config.ts');
    const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
    const tmpFile = path.join(os.tmpdir(), `jest-config-eval-${Date.now()}.ts`);
    let json: string;
    try {
      fs.writeFileSync(tmpFile, EVALUATOR(configPath), 'utf8');
      json = execFileSync(tsxBin, [tmpFile], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
    const wsConfig = JSON.parse(json) as Record<string, unknown>;

    // Extract coverage config before building the project entry — these keys
    // are invalid inside a `projects` entry and must live at root level.
    const rawThreshold = wsConfig.coverageThreshold as Record<string, unknown> | undefined;
    const rawReporters = wsConfig.coverageReporters as string[] | undefined;

    // Strip all coverage keys from the project entry.
    const strippedConfig: Record<string, unknown> = Object.fromEntries(
      Object.entries(wsConfig).filter(([k]) => !(COVERAGE_PROJECT_KEYS as readonly string[]).includes(k)),
    );

    // Inject rootDir and displayName. Jest resolves all relative paths inside a
    // project entry relative to that project's rootDir.
    const entry: Record<string, unknown> = {
      ...strippedConfig,
      rootDir: `<rootDir>/${ws}`,
      displayName: ws,
    };

    projects.push({
      workspace: ws,
      config: entry,
      coverageThreshold: rawThreshold,
      coverageReporters: rawReporters,
    });
  }

  // Build the projects array source
  const projectLines = projects.map((p) => {
    const body = serialise(p.config, '    ');
    return `    // ${p.workspace}\n    ${body}`;
  });

  // Build root-level coverageThreshold using per-workspace directory globs.
  // Each workspace's threshold is applied to its own source files only,
  // matching the per-workspace enforcement of the serial `npm run test:unit`.
  const rootCoverageThreshold: Record<string, unknown> = {};
  for (const { workspace, coverageThreshold } of projects) {
    if (coverageThreshold) {
      // Workspace configs use `{ global: { branches, ... } }` which is correct
      // for a standalone per-project run. When hoisted to a root path-based key,
      // the `global` wrapper must be unwrapped — path/glob keys take the metric
      // values directly (branches/functions/lines/statements).
      const thresholdValues =
        'global' in coverageThreshold
          ? (coverageThreshold.global as Record<string, unknown>)
          : coverageThreshold;

      // Jest matches threshold keys against absolute file paths.
      // Using an absolute path to the workspace directory means Jest aggregates
      // coverage across all files under that directory — matching the `global`
      // behaviour of per-workspace serial runs (where one file's low coverage
      // can be offset by another's high coverage).
      rootCoverageThreshold[`${repoRoot}/${workspace}/`] = thresholdValues;
    }
  }

  // Collect coverageReporters from all workspaces — take the union so no
  // reporter defined in any workspace is lost. Falls back to Jest's default
  // if no workspace defines a custom set.
  const reporterSet = new Set<string>();
  for (const { coverageReporters } of projects) {
    if (coverageReporters) {
      for (const r of coverageReporters) reporterSet.add(r);
    }
  }
  // Canonical reporters for all runs: text (console), lcov (SonarCloud),
  // html (local browsing), cobertura (CI XML). These are always present
  // regardless of what individual workspaces declare.
  reporterSet.add('text');
  reporterSet.add('lcov');
  reporterSet.add('html');
  reporterSet.add('cobertura');
  const rootCoverageReporters = [...reporterSet];

  const banner = `/**
 * Root Jest config — runs all TypeScript workspace test suites in
 * parallel via Jest's native \`projects\` support.
 *
 * ⚠️  THIS FILE IS AUTO-GENERATED. Do not edit it directly.
 *
 * Generated by scripts/generate-parallel-jest-config.ts
 */

/** @type {import('jest').Config} */
module.exports = {
  collectCoverage: true,
  coverageProvider: "babel",
  coverageDirectory: ".reports/unit/coverage",
  coverageReporters: ${serialise(rootCoverageReporters, '  ')},
  coverageThreshold: ${serialise(rootCoverageThreshold, '  ')},
  projects: [
${projectLines.join(',\n\n')}
  ],
};
`;

  fs.writeFileSync(outputPath, banner, 'utf8');
  console.log(`Written: ${path.relative(repoRoot, outputPath)}`);
  console.log(`  ${projects.length} project(s) included`);
  for (const p of projects) {
    console.log(`    ${p.workspace}`);
  }
}

main();

# README Table Generation

This directory contains tools for automatically generating and updating the schema tables in the root `README.md`.

## Overview

The README generation system consists of three scripts:

1. **generate-readme-index.cjs** - Scans workspace structure and creates a yaml index
2. **render-readme.cjs** - Renders README tables from the yaml index
3. **update-readme.cjs** - Wrapper that runs both scripts

## Usage

### Quick Update

To update the README tables after adding/removing schemas or example events:

```bash
make update-readme
```

Or directly:

```bash
node src/tools/generator/update-readme.cjs
```

### How It Works

1. **Scanning**: The generator scans:

   - `src/{domain}/{version}/` for yaml schema files
   - `schemas/{domain}/{version}/events/` for bundled/flattened variants
   - `docs/{domain}/example-events/` for generated example event JSON/MD files

2. **Index Generation**: Creates `readme-index.yaml` containing:

   - All discovered schemas with their source, published, and docs paths
   - All discovered example events
   - Metadata from `readme-metadata.yaml`

3. **README Rendering**: Updates the section between markers in `README.md`:

   ```markdown
   <!-- AUTO-GENERATED-CONTENT:START -->

   ... generated tables ...

   <!-- AUTO-GENERATED-CONTENT:END -->
   ```

## Customization

### Metadata File

Edit `readme-metadata.yaml` to customize:

- **Domain purposes**: Description text for each domain
- **Schema labels**: Override auto-generated schema names
- **Event labels**: Override auto-generated event names

Example:

```yaml
domains:
  examples:
    purpose: "Demonstration event showing complete CloudEvents structure"

schema_labels:
  "nhs-notify-profile": "NHS Notify Profile"
  "file-received-data": "File Received Data"

event_labels:
  "file-received-event": "File Received"
```

### Adding the Markers

If README.md doesn't have the markers yet, add them around the section you want to auto-generate:

```markdown
<!-- AUTO-GENERATED-CONTENT:START -->

## Common Schemas (Shared Across All Domains)

... existing tables ...

<!-- AUTO-GENERATED-CONTENT:END -->
```

## File Structure

```plain
cloudevents/
├── README.md                           # Main documentation (contains markers)
├── readme-metadata.yaml                # Customization metadata
├── readme-index.yaml                   # Generated index (auto-created)
└── src/tools/generator/
    ├── generate-readme-index.cjs       # Workspace scanner
    ├── render-readme.cjs               # Table renderer
    └── update-readme.cjs               # Wrapper script
```

## Workflow

### When adding a new schema

1. Create your yaml schema in `src/{domain}/{version}/`
2. Run `make build deploy build-docs` to generate artifacts
3. Run `make update-readme` to update tables
4. Optionally edit `readme-metadata.yaml` to customize labels
5. Run `make update-readme` again if you changed metadata

### When adding a new domain

1. Create domain folder `src/{domain}/{version}/`
2. Create schemas following the standard structure
3. Run `make build deploy build-docs`
4. Run `make update-readme`
5. Add domain purpose to `readme-metadata.yaml`
6. Run `make update-readme` again

## Output

The generated tables include:

### Common Schemas

- Schema name
- Source yaml path
- Published JSON schema path
- Documentation markdown path
- Purpose descriptions

### Domain Sections

Each domain gets:

- **Purpose** description
- **Schemas** table with all schemas, bundled, and flattened variants
- **Example Events** table with JSON and markdown links

## Notes

- The index file (`readme-index.yaml`) is auto-generated and can be committed or gitignored
- The metadata file (`readme-metadata.yaml`) should be committed as it contains manual customizations
- Schema ordering matches filesystem discovery order (alphabetical within each category)
- Labels default to human-readable names derived from filenames if not specified in metadata

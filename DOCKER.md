# Docker Schema Generation

This Docker container is designed to generate schemas and documentation from the NHS Notify Digital Letters CloudEvents definitions.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build with plain progress output
BUILDKIT_PROGRESS=plain docker-compose build

# Or set it permanently in your shell
export BUILDKIT_PROGRESS=plain

# Then build and run
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker CLI

```bash
# Build the image
docker build -t nhs-notify-schema-gen:latest .

# Run with required mounts
docker run --rm \
  -v $(pwd)/src/cloudevents/domains:/workspace/src/cloudevents/domains \
  -v $(pwd)/docs:/workspace/docs \
  -v $(pwd)/output:/workspace/output \
  -v $(pwd)/schemas:/workspace/schemas \
  -p 4000:4000 \
  nhs-notify-schema-gen:latest

# Run interactively for debugging
docker run --rm -it \
  -v $(pwd)/src/cloudevents/domains:/workspace/src/cloudevents/domains \
  -v $(pwd)/docs:/workspace/docs \
  --entrypoint /bin/zsh \
  nhs-notify-schema-gen:latest
```

## Required Mounts

The following directories **must** be mounted for the container to work:

- `./src/cloudevents/domains` → `/workspace/src/cloudevents/domains` - Source CloudEvents schemas
- `./docs` → `/workspace/docs` - Documentation source and output

## Optional Mounts

- `./output` → `/workspace/output` - Generated output files
- `./schemas` → `/workspace/schemas` - Generated schema files

## What It Does

The container runs the following sequence:

1. `make config` - Installs dependencies and sets up the environment
2. `make clean` - Cleans previous build artifacts
3. `make build` - Generates schemas and builds documentation

## Troubleshooting

### Error: "must be mounted!"

Make sure you're mounting the required directories. Use docker-compose or the full docker run command above.

### Permission Issues

The container runs as the `vscode` user (UID 1000). If you encounter permission issues:

```bash
# Fix ownership on host
sudo chown -R 1000:1000 docs/ src/cloudevents/domains/
```

### Build Errors

If the build fails, check:

- All required source files are present in `src/cloudevents/domains/`
- The `docs/` directory structure is intact
- Dependencies are correctly installed (check logs)

### Interactive Debugging

Run an interactive shell to debug:

```bash
docker run --rm -it \
  -v $(pwd)/src/cloudevents/domains:/workspace/src/cloudevents/domains \
  -v $(pwd)/docs:/workspace/docs \
  --entrypoint /bin/zsh \
  nhs-notify-schema-gen:latest

# Then inside the container
source ~/.zshrc
make config
make build
```

## Environment Variables

- `TERM` - Set to `xterm-256color` for better terminal output (configured in docker-compose.yml)

## Ports

- `4000` - Documentation server (if applicable)

## Image Details

- Base image: `ghcr.io/nhsdigital/nhs-notify-devcontainer-loaded:1.0.19`
- User: `vscode` (UID 1000)
- Working directory: `/workspace`
- Default command: Runs full config, clean, and build process

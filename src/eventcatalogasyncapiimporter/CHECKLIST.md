# AsyncAPI to EventCatalog Importer - User Checklist

## ✅ Pre-Import Checklist

Before running the importer, ensure:

- [ ] Python 3.7+ is installed (`python3 --version`)
- [ ] pip is available (`pip --version`)
- [ ] AsyncAPI files exist in source directory
- [ ] AsyncAPI files follow naming pattern: `asyncapi-*.yaml`
- [ ] EventCatalog directory exists or you have permissions to create it
- [ ] You have write permissions to the EventCatalog directory

## 📋 Installation Checklist

- [ ] Navigate to importer directory: `cd src/eventcatalogasyncapiimporter`
- [ ] Install dependencies using Makefile: `make install`
  - OR install with pip: `pip install -r requirements.txt`
- [ ] Verify PyYAML installed: `python3 -c "import yaml; print('OK')"`
- [ ] Make shell script executable: `chmod +x run_importer.sh`
- [ ] (Optional) View available Makefile commands: `make help`

## 🔧 Configuration Checklist

Choose your configuration method:

### Option A: Use Defaults (Makefile)

- [ ] Run: `make import`
- [ ] Or with verbose output: `make import-verbose`

### Option B: Use Defaults (Python)

- [ ] No configuration needed!
- [ ] Run: `python import_asyncapi.py`

### Option C: Command-Line Arguments

- [ ] Identify your AsyncAPI directory path
- [ ] Identify your EventCatalog directory path
- [ ] Run with Makefile: `make import-custom ASYNCAPI_DIR=<path> EVENTCATALOG_DIR=<path>`
  - OR run with Python: `python import_asyncapi.py --asyncapi-dir <path> --eventcatalog-dir <path>`

### Option D: Configuration File

- [ ] Copy config template: `cp config.sh.example config.sh`
- [ ] Edit `config.sh` with your paths
- [ ] Set ASYNCAPI_DIR
- [ ] Set EVENTCATALOG_DIR
- [ ] Set DOMAIN_NAME (optional)
- [ ] Set VERBOSE=true (optional, for debugging)
- [ ] Run with Makefile: `./run_importer.sh` or `make import`

### Option E: Environment Variables

- [ ] Set environment variables in your shell
- [ ] `export ASYNCAPI_DIR="..."`
- [ ] `export EVENTCATALOG_DIR="..."`
- [ ] `export VERBOSE="true"` (optional)
- [ ] Run with Makefile: `make import`
  - OR run with shell script: `./run_importer.sh`

## 🚀 Running the Importer

### First Run

- [ ] Back up your EventCatalog directory (optional but recommended)
- [ ] Run with Makefile: `make import-verbose`
  - OR run with Python: `python import_asyncapi.py --verbose`
- [ ] Review the output for any errors
- [ ] Check the import summary (services, events, channels created)

### Verify Output

- [ ] Navigate to EventCatalog directory
- [ ] Check `domains/` directory exists
- [ ] Check at least one domain directory created
- [ ] Check services within domains
- [ ] Check `events/` directories within services
- [ ] Check `channels/` directory at root
- [ ] Check markdown files have proper yaml frontmatter

## 🔍 Post-Import Verification

### Check Generated Files

- [ ] Open a domain `index.md` file
- [ ] Verify yaml frontmatter is present (id, name, version)
- [ ] Open a service `index.md` file
- [ ] Verify service metadata is correct
- [ ] Open an event markdown file
- [ ] Verify event details and schema references
- [ ] Open a channel markdown file
- [ ] Verify channel address and messages

### Start EventCatalog

- [ ] Navigate to EventCatalog directory: `cd src/eventcatalog/digital-letters`
- [ ] Install EventCatalog dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Browse domains in the catalog
- [ ] Click through to services
- [ ] View events within services
- [ ] Check channels page

### Visual Verification

- [ ] All domains appear in EventCatalog UI
- [ ] Services are grouped under correct domains
- [ ] Events show up within services
- [ ] Event details are readable
- [ ] Channels are listed correctly
- [ ] No broken links or references
- [ ] NodeGraph renders (if supported)

## 🧪 Testing Checklist

### Unit Tests

- [ ] Run tests with Makefile: `make test`
  - OR run with Python: `python test_import_asyncapi.py`
- [ ] All tests pass
- [ ] No errors in test output

### Manual Testing

- [ ] Run importer twice - should be idempotent
- [ ] Check no duplicates created
- [ ] Modify an AsyncAPI file
- [ ] Re-run importer
- [ ] Verify changes reflected in EventCatalog

## 🐛 Troubleshooting Checklist

### If No Files Are Generated

- [ ] Check AsyncAPI directory path is correct
- [ ] Check AsyncAPI files exist
- [ ] Check file naming: `asyncapi-*.yaml`
- [ ] Check file is valid yaml: `python -c "import yaml; yaml.safe_load(open('file.yaml'))"`
- [ ] Run with `--verbose` flag
- [ ] Check for error messages in output

### If Permission Errors Occur

- [ ] Check write permissions: `ls -la <eventcatalog-dir>`
- [ ] Try: `chmod -R u+w <eventcatalog-dir>`
- [ ] Check parent directories are writable
- [ ] Check disk space: `df -h`

### If Import Errors Occur

- [ ] Run with `--verbose` flag
- [ ] Check Python version: `python3 --version` (need 3.7+)
- [ ] Check PyYAML installed: `pip list | grep PyYAML`
- [ ] Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- [ ] Check for syntax errors in AsyncAPI files

### If Output Looks Wrong

- [ ] Check AsyncAPI file structure matches AsyncAPI 3.0 spec
- [ ] Check channel definitions in AsyncAPI
- [ ] Check operations (send/receive actions)
- [ ] Verify message references are correct
- [ ] Check x-service-metadata if using custom domains

## 🔄 Re-running the Importer

When you need to re-run:

- [ ] Make changes to AsyncAPI files if needed
- [ ] Run importer again (same command)
- [ ] Importer is idempotent - safe to re-run
- [ ] Check for any new resources created
- [ ] Restart EventCatalog dev server if running

## 📝 Best Practices

- [ ] Run importer after AsyncAPI file changes
- [ ] Use version control for EventCatalog output
- [ ] Review generated files before committing
- [ ] Keep AsyncAPI files well-structured
- [ ] Add meaningful descriptions in AsyncAPI
- [ ] Use x-service-metadata for better domain grouping
- [ ] Run with `--verbose` for first-time imports
- [ ] Test in a separate directory first

## 🎓 Learning Checklist

To understand the tool better:

- [ ] Read QUICKSTART.md
- [ ] Read README.md
- [ ] Review examples.py
- [ ] Look at generated markdown files
- [ ] Compare AsyncAPI input to EventCatalog output
- [ ] Try customizing domain classification logic
- [ ] Run unit tests to understand behavior

## 📊 Success Indicators

You've successfully imported when:

- [ ] ✅ No errors in import output
- [ ] ✅ Services count matches expectations
- [ ] ✅ Events count makes sense
- [ ] ✅ Channels are documented
- [ ] ✅ EventCatalog starts without errors
- [ ] ✅ UI shows all your services
- [ ] ✅ Documentation is readable and accurate
- [ ] ✅ Team can browse and discover events

## 🎉 Completion

- [ ] Import completed successfully
- [ ] EventCatalog is running
- [ ] Documentation is accessible
- [ ] Team has been notified
- [ ] Process documented for future runs

## 📞 Support

If you're stuck:

1. [ ] Check troubleshooting section in README.md
2. [ ] Run with `--verbose` for detailed output
3. [ ] Review test files for expected behavior
4. [ ] Check examples.py for usage patterns
5. [ ] Verify AsyncAPI files are valid

---

**Quick Reference Commands:**

```bash
# Install
make install
# OR
pip install -r requirements.txt

# Run (basic)
make import
# OR
python import_asyncapi.py --verbose

# Run (with script)
./run_importer.sh

# Test
make test
# OR
python test_import_asyncapi.py

# Show all commands
make help

# View in EventCatalog
cd ../../eventcatalog/digital-letters && npm run dev
```

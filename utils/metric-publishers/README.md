# metric-publishers module

This is a module is for reporting the certificate expiry time to CloudWatch metric, currently this is used for monitoring the MeshClient certificate expiry.

## Dependencies

- make
- [poetry](https://python-poetry.org/docs/#installation) - package management for Python applications

## Test, Build and Package

`make install` - install dependencies into local virtual environment (in `.venv` directory)

`make test` - run unit tests for the package

`make clean` - remove generated files from the project

## Configuration

### VSCode

If using VSCode, after running `make install`, ensure your Python interpreter is set to the `.venv` directory (cmd+shift+p, "Python: Select Interpreter")

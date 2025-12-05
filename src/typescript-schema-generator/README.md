# typescript-schema-generator

This package provides a tool that generates Typescript types and Javascript
validator functions for the events that are defined in the JSON schemas that
are built as part of this repository.

## Setup

Use `npm install` to install the necessary dependencies for this application.
This can be done from either the root of this repository or from this package's
directory.

## Generating Code

In order for this tool to function, you must first build the JSON schemas for
the Digital Letters events. The simplest way to build these schemas and
use this tool to automatically generate both types and validators is to run the
`npm run generate-dependencies` command from the root of this repository.

This will produce the following:

- Flattened JSON Event schemas in the [`schemas`](../../schemas/) directory
- A full set of JSON schemas in the [`output`](../../output/) directory
- A type definition for each event in the [`src/digital-letters-events/types`](../digital-letters-events/types/) directory
- A validator function for each event in the [`src/digital-letters-events/validators`](../digital-letters-events/validators/) directory

### Generating Types

Once the JSON schemas have been built, types can be generated on their own by
running the `generate-types` script from this package. This will update the
type definitions in the
[`src/digital-letters-events/types`](../digital-letters-events/types/)
directory only.

### Generating Validators

Once the JSON schemas have been built, the validation functions can be
generated on their own by running the `generate-validators` script from this
package. This will update the validator functions in the
[`src/digital-letters-events/validators`](../digital-letters-events/validators/)
directory only.

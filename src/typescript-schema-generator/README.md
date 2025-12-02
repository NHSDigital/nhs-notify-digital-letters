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
- A type definition for each event in the [`types`](./types/) directory
- A validator function for each event in the [`validators`](./validators/) directory

### Generating Types

Once the JSON schemas have been built, types can be generated on their own by
running the `generate-types` script from this package. This will update the
type definitions in [`types`](./types/) only.

### Generating Validators

Once the JSON schemas have been built, the validation functions can be
generated on their own by running the `generate-validators` script from this
package. This will update the validator functions in [`validators`](./validators/) only.

## Using Generated Code

### Using Generated Types

The generated types can be used by simply installing
`typescript-schema-generator` as a dependency of your package and the importing
the desired type:

```typescript
import { PDMResourceSubmitted } from 'typescript-schema-generator';

const pdmResourceSubmittedEvent: PDMResourceSubmitted = {
    type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
    source:
      '/nhs/england/notify/staging/dev-647563337/data-plane/digitalletters/pdm',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json',
    specversion: '1.0',
    id: '0249e529-f947-4012-819e-b634eb71be79',
    subject:
      'customer/7ff8ed41-cd5f-20e4-ef4e-34f96d8cc8ac/75027ace-9b8c-bcfe-866e-6c24242cffc3/q58dnxk5e/4cbek805wwx/yiaw7bl0d/her/1ccb7eb8-c6fe-0a42-279a-2a0e48ff1ca9/zk',
    time: '2025-11-21T16:01:52.268Z',
    datacontenttype: 'application/json',
    traceparent: '00-ee4790eb6821064c645406abe918b3da-3a4e6957ce2a15de-01',
    tracestate: 'nisi quis',
    partitionkey: 'customer-7ff8ed41',
    recordedtime: '2025-11-21T16:01:53.268Z',
    sampledrate: 1,
    sequence: '00000000000350773861',
    severitytext: 'INFO',
    severitynumber: 2,
    dataclassification: 'restricted',
    dataregulation: 'ISO-27001',
    datacategory: 'non-sensitive',
    data: {
      messageReference: 'incididunt Ut aute laborum',
      senderId: 'officia voluptate culpa Ut dolor',
      resourceId: 'a2bcbb42-ab7e-42b6-88d6-74f8d3ca4a09',
      retryCount: 97_903_257,
    },
  };
```

### Using Generated Validator Functions

Validator functions for an event can be used by importing the default export
from the relevant JS file in [`validators`](./validators/):

```typescript
import eventValidator from 'typescript-schema-generator/PDMResourceSubmitted.js';

const event = {};

const isEventValid = eventValidator(event);
if (isEventValid) {
  console.log('Event is valid!');
} else {
  console.error('Validation failure!', eventValidator.errors);
  throw new Error('Event validation failed');
}
```

Note: You will need to make sure the
[`allowJs`](https://www.typescriptlang.org/tsconfig/#allowJs) option is set in
your package's `tsconfig.json` in order to import the JS files.

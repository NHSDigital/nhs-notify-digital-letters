# NHS Notify Digital Letters

Our core programming language is typescript, but also Python.

Our docs are in [.docs](./docs) and are built with jekyll.

This repository is for handling pre rendered letters, handling them for print and also making available for digital viewing. If viewed digitally, then they won't be printed.

This is just one sub domain of the whole of NHS Notify. Inside of this subdomain, there are a number of services, each with a number of microservices. The service could be a bounded context with separate deployability.

Services communicate in an event driven manner, using cloud events. Digital letters has its own Event Bridge, and any events to share with the wider NHS Notify system are forwarded to the core Event Bridge.

You can build docs with `make build` in [.docs](./docs), you will need to `make install` first. This will output to [.docs/_site](./docs/_site). Once this is built you can find out about our architecture at [./docs/site/architecture/c4/index.html](./docs/site/architecture/c4/index.html). It is event driven, events can all be found at [./docs/_site/events.html](./docs/_site/events.html)

All of our events will have their schemas stored in [./schemas/events](./schemas/events). These schemas are used for validation and code generation. The schemas are written in yaml and follow the json schema spec. You can find out more about json schema at [https://json-schema.org/](https://json-schema.org/).

For each event, there will be a schema for the envelope (this is cloud events, and will reference the default NHS Notify cloudevent profile schema). And there will also be a schema for the data payload. The data payload schema will be referenced in the envelope schema.

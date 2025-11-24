---
title: pdm-resource-retries-exceeded
type: uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1
nice_name: PDMResourceRetriesExceeded
service: PDM Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-retries-exceeded-data.schema.json
---

This event indicates that after reaching the maximum configured retries, the FHIR resource was not available for download from PDM. No further attempts will be made to retrieve the resource from PDM.

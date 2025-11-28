---
title: pdm-resource-submitted
type: uk.nhs.notify.digital.letters.pdm.resource.submitted.v1
nice_name: PDMResourceSubmitted
service: PDM Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.pdm.resource.submitted.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json
---

This event indicates that a FHIR resource has been submitted to PDM. It will not be available for use until PDM have completed processing of the resource (indicated by a PDMResourceAvailable event).

---
title: pdm-resource-unavailable
type: uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1
nice_name: PDMResourceUnavailable
service: PDM Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json
---

This event indicates that when DigitalLetters polled PDM to check whether a FHIR resource was available, PDM indicated that the resource was not ready yet. Digital Letters will continue polling PDM until the maximum retries is reached (indicated by a PDMResourceRetriesExceeded event).

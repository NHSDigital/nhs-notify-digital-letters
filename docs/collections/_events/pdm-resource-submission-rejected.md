---
title: pdm-resource-submission-rejected
type: uk.nhs.notify.digital.letters.pdm.resource.submission-rejected.v1
nice_name: PDMResourceSubmissionRejected
service: PDM Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.pdm.resource.submission-rejected.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submission-rejected-data.schema.json
---

This event indicates that PDM rejected the request to upload the FHIR resource. Digital Letters will fallback to sending a printed letter after the sender's configured fallback wait time.

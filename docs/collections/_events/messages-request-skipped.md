---
title: messages-request-skipped
type: uk.nhs.notify.digital.letters.messages.request.skipped.v1
nice_name: MessageRequestSkipped
service: Messages Client
schema_envelope: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.messages.request.skipped.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/messages.request.skipped-data.v1.schema.json
---

This event is published when the request to Notify Core (to send an NHS App message) is intentionally skipped. In normal operation this can happen if the requesting client has not configured a Routing Plan during onboarding to DigitalLetters.

uk.nhs.notify.digital.letters.core.request.skipped.v1.schema

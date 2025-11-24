---
title: queue-item-removed
type: uk.nhs.notify.digital.letters.queue.item.removed.v1
nice_name: ItemRemoved
service: Queue Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.queue.item.removed.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-removed-data.schema.json
---

This event indicates that a TTL record has been intentionally removed before its expiry time (likely due to the letter being read digitally).

---
title: queue-item-dequeued
type: uk.nhs.notify.digital.letters.queue.item.dequeued.v1
nice_name: ItemDequeued
service: Queue Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.queue.item.dequeued.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-dequeued-data.schema.json
---

This event indicates that a TTL record has been dequeued due to exceeding its expiry time. This suggests that a letter was not read digitally within the configured fallback time, and that the letter will now proceed to printing.

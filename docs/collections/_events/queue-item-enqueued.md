---
title: queue-item-enqueued
type: uk.nhs.notify.digital.letters.queue.item.enqueued.v1
nice_name: ItemEnqueued
service: Queue Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.queue.item.enqueued.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-enqueued-data.schema.json
---

This event indicates that a TTL record has been queued for a given letter. The TTL record will either be intentionally removed before its expiry if the letter is read digitally (indicated by an ItemRemoved event) or will be dequeued after the fallback wait time (indicated by a ItemDequeued event) to trigger printing.

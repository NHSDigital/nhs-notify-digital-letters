---
title: print-status-changed
type: uk.nhs.notify.digital.letters.print.status.changed.v1
nice_name: PrintStatusChanged
service: Print Supplier Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.print.status.changed.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letter-base-data.schema.json
---

This event signals that the status of a letter in the print supplier's system has changed. It is a Digital Letters internal representation of the various status update events received from the external print supplier API, such as "letter.ACCEPTED", "letter.REJECTED", "letter.PRINTED", "letter.DISPATCHED", "letter.FAILED", and "letter.RETURNED".

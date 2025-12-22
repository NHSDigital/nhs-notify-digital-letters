---
title: print-letter-transitioned
type: uk.nhs.notify.digital.letters.print.letter.transitioned.v1
nice_name: PrintLetterTransitioned
service: Print Supplier Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.print.letter.transitioned.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-letter-transitioned-data.schema.json
---

This event signals that a letter in the print supplier's system has been transitioned. It is a Digital Letters internal representation of the various status update events received from the external print supplier API, such as "letter.ACCEPTED", "letter.REJECTED", "letter.PRINTED", "letter.DISPATCHED", "letter.FAILED", and "letter.RETURNED".

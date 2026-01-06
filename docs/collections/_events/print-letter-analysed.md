---
title: print-letter-analysed
type: uk.nhs.notify.digital.letters.print.letter.analysed.v1
nice_name: PrintLetterAnalysed
service: Print Supplier Services
schema_envelope:  https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/events/uk.nhs.notify.digital.letters.print.letter.analysed.v1.schema.json
schema_data: https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-letter-analysed-data.schema.json
---

This event is published when a PDF letter has been analysed in preparation for sending to print. In addition to the standard metadata fields relating to the message request, the event payload also contains a count of the number of pages in the letter and a SHA256 hash of the file. This information can be used by the Print Supplier API to verify the integrity of the letter before it is printed.

---

title: Report Recorder
parent:  Reporting
nav_order: 1
has_children: true
is_not_draft: false
last_modified_date: 2025-10-24
owner: Tom D'Roza
author: Tom D'Roza
diagrams: [c4code-tracker-listener, c4component-nhsapp-callback, sequence-nhsapp-callback]
events-raised: []
events-consumed: [
    mesh-inbox-message-downloaded,
    mesh-inbox-message-received,
    mesh-status-report-sent,
    messages-request-sent,
    messages-request-submitted,
    pdm-resource-retries-exceeded,
    pdm-resource-submitted,
    print-printed,
    reporting-daily-report-generated,
    viewer-digital-letter-read,
    queue-item-enqueued,
    queue-item-removed,
    queue-item-dequeued
    ]
description: Listens to all events and generates up the report
c4type: code

---

---

title: Report Generator
parent:  Digital Letter Status Reports
nav_order: 1
has_children: true
is_not_draft: false
last_modified_date: 2025-10-17
owner: Tom D'Roza
author: Tom D'Roza
diagrams: [c4code-tracker-listener, c4component-nhsapp-callback, sequence-nhsapp-callback]
events-raised: [reporting-daily-report-generated]
events-consumed: [
    mesh-file-found,
    mesh-file-saved,
    mesh-status-report-sent,
    pdm-file-saved]
description: Listens to all events and generates up the report
c4type: code

---

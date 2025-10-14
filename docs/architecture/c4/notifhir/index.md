---
layout: page
title: NotiFHIR - C4 Container
parent: Digital Letters - C4 System Context
nav_order: 6
has_children: true
is_not_draft: false
last_modified_date: 2024-05-28
owner: Ross Buggins
author: Ross Buggins
---

```mermaid
    C4Context
      title Container NotiFHIR

        Container_Boundary(notify01, "NotiFHIR") {
          Container(notify02, "MESH", "Python", "All things MESH", $tags="v1.0", $link="https://www.google.com")
          Container(notify03, "Notifier", $link="https://www.google.com")
          Container(notify04, "PDM")
          Container(notify05, "Printer")
          Container(notify06, "Tracker")

        }






```

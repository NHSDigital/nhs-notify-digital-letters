---

title: c4component-statusreports
description: Real time generation of status reports
c4type: code
---

```mermaid
    C4Component
    title Status Reports Component
    Container_Boundary(meshcontainer, "Status Reports Container") {

         Component(dailygenerator, "Daily Report Generator")
         Component(meshlistener, "MESH Event Listener")
         Component(pdmlistener, "PDM Event Listener")
         Component(printerlistener, "Printer Event Listener")


         Rel(meshlistener, dailygenerator, "EventX", "CloudEvent")
         Rel(pdmlistener, dailygenerator, "EventX", "CloudEvent")
         Rel(printerlistener, dailygenerator, "EventX", "CloudEvent")

         UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")


    }
```

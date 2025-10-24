---

title: c4component-pdm

---

```mermaid
    C4Component
    title PDM Component
    Container_Boundary(meshcontainer, "PDM Services Container") {

         Component(poller, "Trigger getting message list")
         Component(retriemeta, "PDM Poller")
         Component(saver, "PDM Uploader")


    }
```

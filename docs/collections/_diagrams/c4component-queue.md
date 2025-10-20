---

title: c4component-queue

---

```mermaid
    C4Component
    title Queue Component
    Container_Boundary(meshcontainer, "Print Queue Services Container") {

         Component(adder, "Add to queue")
         Component(remover, "Remove from queue")
         Component(expirer, "Expire from queue")
         ComponentDb(queue, "Queue")

         Rel(adder, queue, "", "")
         Rel(remover, queue, "", "")
         Rel(expirer, queue, "", "")

         UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")


    }
```

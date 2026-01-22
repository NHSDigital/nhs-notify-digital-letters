resource "aws_cloudwatch_event_rule" "item_dequeued" {
  name           = "${local.csi}-item-dequeued"
  description    = "Queue item dequeued event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.queue.item.dequeued.v1"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "item_dequeued_scanner" {
  rule           = aws_cloudwatch_event_rule.item_dequeued.name
  arn            = module.sqs_scanner.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

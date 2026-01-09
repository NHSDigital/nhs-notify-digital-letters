resource "aws_cloudwatch_event_rule" "print_status_changed" {
  name           = "${local.csi}-print-status-changed"
  description    = "Print status changed event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.supplier-api.letter.ACCEPTED.v1",
        "uk.nhs.notify.supplier-api.letter.REJECTED.v1",
        "uk.nhs.notify.supplier-api.letter.PRINTED.v1",
        "uk.nhs.notify.supplier-api.letter.DISPATCHED.v1",
        "uk.nhs.notify.supplier-api.letter.FAILED.v1",
        "uk.nhs.notify.supplier-api.letter.RETURNED.v1"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "print_status_changed_print_status_handler" {
  rule           = aws_cloudwatch_event_rule.print_status_changed.name
  arn            = module.sqs_print_status_handler.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

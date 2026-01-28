resource "aws_cloudwatch_event_rule" "print_status_changed" {
  name           = "${local.csi}-print-status-changed"
  description    = "Print status changed event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [{
        "prefix" : "uk.nhs.notify.supplier-api.letter."
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "print_status_changed_print_status_handler" {
  rule           = aws_cloudwatch_event_rule.print_status_changed.name
  arn            = module.sqs_print_status_handler.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

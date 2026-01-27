resource "aws_cloudwatch_event_rule" "file_safe" {
  name           = "${local.csi}-file-safe"
  description    = "File safe event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.print.file.safe.v1"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "file_safe_print_analyser" {
  rule           = aws_cloudwatch_event_rule.file_safe.name
  arn            = module.sqs_print_analyser.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

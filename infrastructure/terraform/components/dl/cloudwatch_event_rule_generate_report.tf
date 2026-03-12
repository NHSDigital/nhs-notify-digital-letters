resource "aws_cloudwatch_event_rule" "generate_report" {
  name           = "${local.csi}-generate-report"
  description    = "Generate Report event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.reporting.generate.report.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "generate_report_report_generator" {
  rule           = aws_cloudwatch_event_rule.generate_report.name
  arn            = module.sqs_report_generator.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

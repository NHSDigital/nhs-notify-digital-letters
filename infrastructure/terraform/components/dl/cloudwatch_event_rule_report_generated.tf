resource "aws_cloudwatch_event_rule" "report_generated" {
  name           = "${local.csi}-report-generated"
  description    = "Route ReportGenerated events from report-generation lambda to report-sender queue"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.reporting.report.generated.v1"
      ]
    }
  })
}

# EventBridge target to send events to SQS queue
resource "aws_cloudwatch_event_target" "report_sender_sqs" {
  rule           = aws_cloudwatch_event_rule.report_generated.name
  arn            = module.sqs_report_sender.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

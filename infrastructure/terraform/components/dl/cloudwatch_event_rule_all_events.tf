resource "aws_cloudwatch_event_rule" "all_events" {
  name           = "${local.csi}-all-events"
  description    = "Event rule to match all Digital Letters events"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [{
        "prefix" : "uk.nhs.notify.digital.letters."
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "reporting_firehose" {
  rule           = aws_cloudwatch_event_rule.all_events.name
  arn            = aws_kinesis_firehose_delivery_stream.to_s3_reporting.arn
  role_arn       = aws_iam_role.eventbridge_firehose.arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

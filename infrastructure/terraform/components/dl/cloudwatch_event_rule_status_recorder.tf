resource "aws_cloudwatch_event_rule" "status_recorder" {
  name           = "${local.csi}-status-recorder"
  description    = "Status recorder event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [{
        "prefix" : "uk.nhs.notify.digital.letters."
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "status_recorder" {
  rule           = aws_cloudwatch_event_rule.status_recorder.name
  arn            = aws_kinesis_firehose_delivery_stream.to_s3_reporting.arn
  role_arn       = aws_iam_role.eventbridge_firehose.arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

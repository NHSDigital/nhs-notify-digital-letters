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

  input_transformer {
    input_paths = {
      time             = "$.detail.time",
      type             = "$.detail.type",
      messageReference = "$.detail.data.messageReference",
      pageCount        = "$.detail.data.pageCount",
      reasonCode       = "$.detail.data.reasonCode",
      reasonText       = "$.detail.data.reasonText",
      senderId         = "$.detail.data.senderId",
      supplierId       = "$.detail.data.supplierId",
    }
    input_template = <<EOF
{
  "time": <time>,
  "type": <type>,
  "messageReference": <messageReference>,
  "pageCount": <pageCount>,
  "reasonCode": <reasonCode>,
  "reasonText": <reasonText>,
  "senderId": <senderId>,
  "supplierId": <supplierId>
}
EOF
  }
}

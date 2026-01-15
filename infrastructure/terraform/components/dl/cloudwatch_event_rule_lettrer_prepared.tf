resource "aws_cloudwatch_event_rule" "letter_prepared" {
  name           = "${local.csi}-pdf-analysed"
  description    = "PDF Analysed event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.letter-rendering.letter-request.prepared.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "letter-prepared-main-bus-target" {
  rule           = aws_cloudwatch_event_rule.letter_prepared.name
  arn            = module.eventpub.sns_topic.arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

resource "aws_cloudwatch_event_rule" "replacewith_event_name" {
  name           = "${local.csi}-replacewith_event_name"
  description    = "replacewith_event_name event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.pdm.resource.available.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "replacewith_event_name_replacewith_component_name" {
  rule           = aws_cloudwatch_event_rule.replacewith_event_name.name
  arn            = module.sqs_replacewith_component_name.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

resource "aws_cloudwatch_event_rule" "pdm_resource_unavailable" {
  name           = "${local.csi}-pdm-resource-unavailable"
  description    = "PDM resource unavailable event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "pdm_resource_unavailable_pdm_poll" {
  rule           = aws_cloudwatch_event_rule.pdm_resource_unavailable.name
  arn            = module.sqs_pdm_poll.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

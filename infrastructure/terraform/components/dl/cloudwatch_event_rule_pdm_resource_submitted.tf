resource "aws_cloudwatch_event_rule" "pdm_resource_submitted" {
  name           = "${local.csi}-pdm-resource-submitted"
  description    = "PDM resource submitted event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.pdm.resource.submitted.v1"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "pdm_resource_submitted" {
  rule           = aws_cloudwatch_event_rule.pdm_resource_submitted.name
  arn            = module.sqs_pdm_poll.sqs_queue_arn
  target_id      = "pdm-resource-submitted-target"
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

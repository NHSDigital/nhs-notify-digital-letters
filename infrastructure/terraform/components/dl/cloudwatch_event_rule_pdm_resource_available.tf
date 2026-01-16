resource "aws_cloudwatch_event_rule" "pdm_resource_available" {
  name           = "${local.csi}-pdm-resource-available"
  description    = "PDM resource available event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.pdm.resource.available.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "pdm_resource_available_core_notifier" {
  rule           = aws_cloudwatch_event_rule.pdm_resource_available.name
  arn            = module.sqs_core_notifier.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

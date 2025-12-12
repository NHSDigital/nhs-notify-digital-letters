resource "aws_cloudwatch_event_rule" "mesh_inbox_message_downloaded" {
  name           = "${local.csi}-mesh-inbox-message-downloaded"
  description    = "MESH inbox message downloaded event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "create-ttl-target" {
  rule           = aws_cloudwatch_event_rule.mesh_inbox_message_downloaded.name
  arn            = module.sqs_ttl.sqs_queue_arn
  target_id      = "create-ttl-target"
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

resource "aws_cloudwatch_event_target" "pdm-uploader-target" {
  rule           = aws_cloudwatch_event_rule.mesh_inbox_message_downloaded.name
  arn            = module.sqs_pdm_uploader.sqs_queue_arn
  target_id      = "pdm-uploader-target"
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

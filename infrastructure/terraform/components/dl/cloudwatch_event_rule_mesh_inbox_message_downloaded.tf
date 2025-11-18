resource "aws_cloudwatch_event_rule" "mesh_inbox_message_downloaded" {
  name           = "${local.csi}-mesh-inbox-message-downloaded"
  description    = "MESH inbox message downloaded event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1"
      ],
      "dataschemaversion" : [{
        "prefix" : "1."
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "mesh_inbox_message_downloaded" {
  rule           = aws_cloudwatch_event_rule.mesh_inbox_message_downloaded.name
  arn            = module.sqs_ttl.sqs_queue_arn
  target_id      = "mesh-inbox-message-downloaded-target"
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

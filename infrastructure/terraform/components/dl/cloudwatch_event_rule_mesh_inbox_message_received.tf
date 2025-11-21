resource "aws_cloudwatch_event_rule" "mesh_inbox_message_received" {
  name           = "${local.csi}-mesh-inbox-message-received"
  description    = "Route MESHInboxMessageReceived events from mesh-poll lambda to mesh-download queue"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1"
      ],
      "dataschemaversion" : [{
        "prefix" : "1."
      }]
    }
  })
}

# EventBridge target to send events to SQS queue
resource "aws_cloudwatch_event_target" "mesh_download_sqs" {
  rule           = aws_cloudwatch_event_rule.mesh_inbox_message_received.name
  target_id      = "mesh-inbox-message-received-sqs-target"
  arn            = module.sqs_mesh_download.queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

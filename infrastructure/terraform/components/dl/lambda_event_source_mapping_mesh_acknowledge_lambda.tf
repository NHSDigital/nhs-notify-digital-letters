resource "aws_lambda_event_source_mapping" "sqs_mesh_acknowledge_lambda" {
  event_source_arn                   = module.sqs_mesh_acknowledge.sqs_queue_arn
  function_name                      = module.mesh_acknowledge.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

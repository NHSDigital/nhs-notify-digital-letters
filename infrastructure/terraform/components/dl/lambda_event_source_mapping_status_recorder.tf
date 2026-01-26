resource "aws_lambda_event_source_mapping" "status_recorder" {
  event_source_arn                   = module.sqs_status_recorder.sqs_queue_arn
  function_name                      = module.status_recorder.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

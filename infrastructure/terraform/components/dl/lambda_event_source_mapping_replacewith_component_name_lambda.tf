resource "aws_lambda_event_source_mapping" "replacewith_component_name_lambda" {
  event_source_arn                   = module.sqs_replacewith_component_name.sqs_queue_arn
  function_name                      = module.replacewith_component_name.function_arn
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

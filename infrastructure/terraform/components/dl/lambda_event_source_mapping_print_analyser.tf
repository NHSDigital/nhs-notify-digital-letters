resource "aws_lambda_event_source_mapping" "print_analyser" {
  event_source_arn                   = module.sqs_print_analyser.sqs_queue_arn
  function_name                      = module.print_analyser.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

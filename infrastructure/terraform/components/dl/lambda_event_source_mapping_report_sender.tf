resource "aws_lambda_event_source_mapping" "report_sender" {
  event_source_arn                   = module.sqs_report_sender.sqs_queue_arn
  function_name                      = module.report_sender.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

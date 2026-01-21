resource "aws_lambda_event_source_mapping" "file_scanner" {
  event_source_arn                   = module.sqs_scanner.sqs_queue_arn
  function_name                      = module.file_scanner.lambda_function_name
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
}

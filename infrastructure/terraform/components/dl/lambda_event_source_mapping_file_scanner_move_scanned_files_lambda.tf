resource "aws_lambda_event_source_mapping" "file_scanner_move_scanned_files_lambda" {
  event_source_arn                   = module.sqs_file_scanner_move_scanned_files.sqs_queue_arn
  function_name                      = module.file_scanner_move_scanned_files.function_arn
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

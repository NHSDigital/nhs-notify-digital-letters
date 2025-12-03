resource "aws_lambda_event_source_mapping" "sqs_upload_to_pdm_lambda" {
  event_source_arn                   = module.sqs_upload_to_pdm.sqs_queue_arn
  function_name                      = module.upload_to_pdm.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

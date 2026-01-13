resource "aws_lambda_event_source_mapping" "pdm_poll_lambda" {
  event_source_arn                   = module.sqs_pdm_poll.sqs_queue_arn
  function_name                      = module.pdm_poll.function_name
  batch_size                         = var.queue_batch_size
  maximum_batching_window_in_seconds = var.queue_batch_window_seconds

  function_response_types = [
    "ReportBatchItemFailures"
  ]
}

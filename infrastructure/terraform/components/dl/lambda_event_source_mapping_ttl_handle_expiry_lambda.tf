resource "aws_lambda_event_source_mapping" "ttl_handle_expiry_lambda" {
  event_source_arn                   = aws_dynamodb_table.ttl.stream_arn
  function_name                      = module.ttl_handle_expiry.function_arn
  starting_position                  = "TRIM_HORIZON"
  batch_size                         = 50
  maximum_batching_window_in_seconds = 10
  maximum_retry_attempts             = 3

  function_response_types = [
    "ReportBatchItemFailures"
  ]

  destination_config {
    on_failure {
      destination_arn = module.sqs_ttl_handle_expiry_errors.sqs_queue_arn
    }
  }

  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName : ["REMOVE"]
      })
    }
  }
}

resource "aws_lambda_event_source_mapping" "ttl_handle_expiry_lambda" {
  event_source_arn  = aws_dynamodb_table.ttl.stream_arn
  function_name     = module.ttl_handle_expiry.function_arn
  starting_position = "TRIM_HORIZON"
  batch_size        = 50
}

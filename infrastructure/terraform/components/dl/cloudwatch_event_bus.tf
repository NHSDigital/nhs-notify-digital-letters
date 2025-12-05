resource "aws_cloudwatch_event_bus" "main" {
  name = "${local.csi}"

  kms_key_identifier = module.kms.key_id

  log_config {
    include_detail = "FULL"
    level          = "TRACE"
  }
}

# CloudWatch Log Delivery Sources for INFO, ERROR, and TRACE logs
resource "aws_cloudwatch_log_delivery_source" "main_info_logs" {
  name         = "EventBusSource-${aws_cloudwatch_event_bus.main.name}-INFO_LOGS"
  log_type     = "INFO_LOGS"
  resource_arn = aws_cloudwatch_event_bus.main.arn
}

resource "aws_cloudwatch_log_delivery_source" "main_error_logs" {
  name         = "EventBusSource-${aws_cloudwatch_event_bus.main.name}-ERROR_LOGS"
  log_type     = "ERROR_LOGS"
  resource_arn = aws_cloudwatch_event_bus.main.arn
}

resource "aws_cloudwatch_log_delivery_source" "main_trace_logs" {
  name         = "EventBusSource-${aws_cloudwatch_event_bus.main.name}-TRACE_LOGS"
  log_type     = "TRACE_LOGS"
  resource_arn = aws_cloudwatch_event_bus.main.arn
}

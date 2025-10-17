resource "aws_cloudwatch_log_delivery_destination" "event_bus" {
  name = "EventsDeliveryDestination-${aws_cloudwatch_event_bus.main.name}"

  delivery_destination_configuration {
    destination_resource_arn = aws_cloudwatch_log_group.event_bus.arn
  }
}

resource "aws_cloudwatch_log_delivery" "events_info_logs" {
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.event_bus.arn
  delivery_source_name     = aws_cloudwatch_log_delivery_source.main_info_logs.name
}

resource "aws_cloudwatch_log_delivery" "events_error_logs" {
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.event_bus.arn
  delivery_source_name     = aws_cloudwatch_log_delivery_source.main_error_logs.name
  depends_on = [
    aws_cloudwatch_log_delivery.events_info_logs
  ]
}

resource "aws_cloudwatch_log_delivery" "events_trace_logs" {
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.event_bus.arn
  delivery_source_name     = aws_cloudwatch_log_delivery_source.main_trace_logs.name
  depends_on = [
    aws_cloudwatch_log_delivery.events_error_logs
  ]
}

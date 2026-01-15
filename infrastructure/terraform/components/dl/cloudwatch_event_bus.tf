resource "aws_cloudwatch_event_bus" "main" {
  name = local.csi

  kms_key_identifier = module.kms.key_id

  log_config {
    include_detail = "FULL"
    level          = "TRACE"
  }

  iam_policy_document = {
    body = data.aws_iam_policy_document.main_event_bus.json
  }
}

resource "aws_cloudwatch_event_bus_policy" "main_event_bus" {
  policy         = data.aws_iam_policy_document.main_event_bus.json
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

data "aws_iam_policy_document" "main_event_bus" {
  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    actions = [
      "sns:Publish"
    ]

    resources = [
      module.eventpub.sns_topic.arn
    ]
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

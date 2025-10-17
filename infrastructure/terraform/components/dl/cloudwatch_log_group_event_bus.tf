resource "aws_cloudwatch_log_group" "event_bus" {
  name              = "/aws/vendedlogs/events/event-bus/${local.csi}"
  retention_in_days = var.log_retention_in_days
  kms_key_id        = module.kms.key_arn
}

resource "aws_cloudwatch_log_resource_policy" "event_bus" {
  policy_document = data.aws_iam_policy_document.event_bus_logs.json
  policy_name     = "AWSLogDeliveryWrite-${aws_cloudwatch_event_bus.main.name}"
}

data "aws_iam_policy_document" "event_bus_logs" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.event_bus.arn}:log-stream:*"
    ]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [var.aws_account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values = [
        aws_cloudwatch_log_delivery_source.main_info_logs.arn,
        aws_cloudwatch_log_delivery_source.main_error_logs.arn,
        aws_cloudwatch_log_delivery_source.main_trace_logs.arn
      ]
    }
  }
}

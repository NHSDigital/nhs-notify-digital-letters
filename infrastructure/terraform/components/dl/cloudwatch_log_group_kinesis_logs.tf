resource "aws_cloudwatch_log_group" "kinesis_logs" {
  name              = "/aws/kinesisfirehose/${local.csi}-to-s3-reporting"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_stream" "reporting_kinesis_logs" {
  name           = "${local.csi}reportingKinesisLogs"
  log_group_name = aws_cloudwatch_log_group.kinesis_logs.name
}

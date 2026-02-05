resource "aws_cloudwatch_metric_alarm" "metadata_refresh_executions_timedout" {
  alarm_name          = "${local.csi}-metadata-refresh-executions-timedout"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ExecutionsTimedOut"
  namespace           = "AWS/States"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "This metric monitors step function execution timeouts"
  treat_missing_data  = "notBreaching"

  dimensions = {
    StateMachineArn = aws_sfn_state_machine.metadata_refresh.arn
  }
}

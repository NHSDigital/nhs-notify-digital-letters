resource "aws_cloudwatch_event_rule" "guardduty_scan_result" {
  name           = "${local.csi}-guardduty_scan_result"
  description    = "guardduty Scan Result event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern = jsonencode({
    "source": "aws.guardduty"
    "detail" : {
      "scanStatus" :  "COMPLETED",
      "resourceType": "S3_OBJECT",
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_scan_result_file_scanner_move_scanned_files" {
  rule           = aws_cloudwatch_event_rule.guardduty_scan_result.name
  arn            = module.sqs_file_scanner_move_scanned_files.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}

resource "aws_cloudwatch_event_rule" "guardduty_scan_result" {
  name           = "${local.csi}-guardduty_scan_result"
  description    = "guardduty Scan Result event rule"
  event_bus_name = var.default_cloudwatch_event_bus_name
  event_pattern = jsonencode({
    "source": ["aws.guardduty"]
    "detail" : {
      "resourceType": ["S3_OBJECT"],
      "s3ObjectDetails": {
            "bucketName": [ local.unscanned_files_bucket ],
            "objectKey": [{ "prefix": "${var.environment}/" }]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_scan_result_move_scanned_files" {
  rule           = aws_cloudwatch_event_rule.guardduty_scan_result.name
  arn            = module.sqs_move_scanned_files.sqs_queue_arn
  event_bus_name = var.default_cloudwatch_event_bus_name
}

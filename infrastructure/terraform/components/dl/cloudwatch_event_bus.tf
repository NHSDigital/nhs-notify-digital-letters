resource "aws_cloudwatch_event_bus" "main" {
  name = "${local.csi}"

  kms_key_identifier = module.kms.key_id

  log_config {
    include_detail = "FULL"
    level          = "TRACE"
  }
}

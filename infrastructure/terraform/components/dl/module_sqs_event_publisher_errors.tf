module "sqs_event_publisher_errors" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-sqs.zip"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  name           = "event-publisher-errors"

  sqs_kms_key_arn = module.kms.key_arn

  visibility_timeout_seconds = 60
}

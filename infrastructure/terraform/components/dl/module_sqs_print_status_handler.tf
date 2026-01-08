module "sqs_print_status_handler" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-sqs.zip"

  aws_account_id             = var.aws_account_id
  component                  = local.component
  environment                = var.environment
  project                    = var.project
  region                     = var.region
  name                       = "print-status-handler"
  sqs_kms_key_arn            = module.kms.key_arn
  visibility_timeout_seconds = 60
  delay_seconds              = 5
  create_dlq                 = true
  sqs_policy_overload        = data.aws_iam_policy_document.sqs_print_status_handler.json
}

data "aws_iam_policy_document" "sqs_print_status_handler" {
  statement {
    sid    = "AllowEventBridgeToSendMessage"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions = [
      "sqs:SendMessage"
    ]

    resources = [
      "arn:aws:sqs:${var.region}:${var.aws_account_id}:${local.csi}-print-status-handler-queue"
    ]
  }
}

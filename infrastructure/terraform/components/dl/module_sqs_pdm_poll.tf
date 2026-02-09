module "sqs_pdm_poll" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.30/terraform-sqs.zip"

  aws_account_id             = var.aws_account_id
  component                  = local.component
  environment                = var.environment
  project                    = var.project
  region                     = var.region
  name                       = "pdm-poll"
  sqs_kms_key_arn            = module.kms.key_arn
  visibility_timeout_seconds = 60
  delay_seconds              = 5
  create_dlq                 = true
  sqs_policy_overload        = data.aws_iam_policy_document.sqs_pdm_poll.json
}

data "aws_iam_policy_document" "sqs_pdm_poll" {
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
      "arn:aws:sqs:${var.region}:${var.aws_account_id}:${local.csi}-pdm-poll-queue"
    ]
  }
}

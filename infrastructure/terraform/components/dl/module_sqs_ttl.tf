module "sqs_ttl" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.30/terraform-sqs.zip"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  name           = "ttl"

  sqs_kms_key_arn = module.kms.key_arn

  visibility_timeout_seconds = 60

  create_dlq = true

  sqs_policy_overload = data.aws_iam_policy_document.sqs_ttl.json
}

data "aws_iam_policy_document" "sqs_ttl" {
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
      "arn:aws:sqs:${var.region}:${var.aws_account_id}:${local.csi}-ttl-queue"
    ]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.mesh_inbox_message_downloaded.arn]
    }
  }
}

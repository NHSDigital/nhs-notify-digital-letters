module "sqs_file_scanner_move_scanned_files" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-sqs.zip"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  name           = "file_scanner_move_scanned_files"

  sqs_kms_key_arn = module.kms.key_arn

  visibility_timeout_seconds = 60

  create_dlq = true

  sqs_policy_overload = data.aws_iam_policy_document.sqs_file_scanner_move_scanned_files.json
}

data "aws_iam_policy_document" "sqs_file_scanner_move_scanned_files" {
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
      "arn:aws:sqs:${var.region}:${var.aws_account_id}:${local.csi}-file_scanner_move_scanned_files-queue"
    ]
  }
}

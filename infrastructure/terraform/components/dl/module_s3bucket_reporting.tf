module "s3bucket_reporting" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.30/terraform-s3bucket.zip"

  name = "reporting"

  aws_account_id = var.aws_account_id
  region         = var.region
  project        = var.project
  environment    = var.environment
  component      = local.component

  kms_key_arn = module.kms.key_arn

  policy_documents = [data.aws_iam_policy_document.s3bucket_reporting.json]

  force_destroy = var.force_destroy

  lifecycle_rules = [
    {
      prefix  = "kinesis-firehose-output"
      enabled = true

      expiration = {
        days = local.pii_retention_config.current_days
      }

      noncurrent_version_expiration = {
        noncurrent_days = local.pii_retention_config.non_current_days
      }
    },
    {
      prefix  = "athena-output"
      enabled = true

      expiration = {
        days = local.reports_retention_config.current_days
      }

      noncurrent_version_expiration = {
        noncurrent_days = local.reports_retention_config.non_current_days
      }
    },
    {
      prefix  = "transactional-reports"
      enabled = true

      expiration = {
        days = local.reports_retention_config.current_days
      }

      noncurrent_version_expiration = {
        noncurrent_days = local.reports_retention_config.non_current_days
      }
    }
  ]
}

data "aws_iam_policy_document" "s3bucket_reporting" {
  statement {
    sid    = "AllowManagedAccountsToList"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      module.s3bucket_reporting.arn,
    ]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.aws_account_id}:root"
      ]
    }
  }

  statement {
    sid    = "AllowManagedAccountsToGet"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = [
      "${module.s3bucket_reporting.arn}/*",
    ]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.aws_account_id}:root"
      ]
    }
  }
}

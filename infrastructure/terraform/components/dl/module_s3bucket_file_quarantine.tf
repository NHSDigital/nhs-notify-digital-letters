module "s3bucket_file_quarantine" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v3.0.1/terraform-s3bucket.zip"

  name = "file-quarantine"

  aws_account_id = var.aws_account_id
  region         = var.region
  project        = var.project
  environment    = var.environment
  component      = local.component

  kms_key_arn = module.kms.key_arn

  policy_documents = [data.aws_iam_policy_document.s3bucket_file_quarantine.json]

  force_destroy = var.force_destroy

  lifecycle_rules = [
    {
      enabled = true

      expiration = {
        days = "90"
      }

      noncurrent_version_transition = [
        {
          noncurrent_days = "30"
          storage_class   = "STANDARD_IA"
        }
      ]

      noncurrent_version_expiration = {
        noncurrent_days = "90"
      }

      abort_incomplete_multipart_upload = {
        days = "1"
      }
    }
  ]
}

data "aws_iam_policy_document" "s3bucket_file_quarantine" {
  statement {
    sid    = "AllowManagedAccountsToList"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      module.s3bucket_file_quarantine.arn,
    ]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.aws_account_id}:root"
      ]
    }
  }

  statement {
    sid    = "AllowManagedAccountsToGetPut"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = [
      "${module.s3bucket_file_quarantine.arn}/*",
    ]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.aws_account_id}:root"
      ]
    }
  }
}

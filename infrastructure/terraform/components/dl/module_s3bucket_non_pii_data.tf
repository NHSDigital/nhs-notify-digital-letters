module "s3bucket_non_pii_data" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.30/terraform-s3bucket.zip"

  name = "non-pii-data"

  aws_account_id = var.aws_account_id
  region         = var.region
  project        = var.project
  environment    = var.environment
  component      = local.component

  kms_key_arn = module.kms.key_arn

  policy_documents = [data.aws_iam_policy_document.s3bucket_non_pii_data.json]

  force_destroy = var.force_destroy
}

data "aws_iam_policy_document" "s3bucket_non_pii_data" {
  statement {
    sid    = "AllowManagedAccountsToList"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      module.s3bucket_non_pii_data.arn,
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
      "${module.s3bucket_non_pii_data.arn}/*",
    ]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.aws_account_id}:root"
      ]
    }
  }
}

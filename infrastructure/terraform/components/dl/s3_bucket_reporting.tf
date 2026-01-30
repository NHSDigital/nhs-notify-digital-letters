resource "aws_s3_bucket" "reporting" {
  bucket        = "${local.csi_global}-reporting"
  force_destroy = var.force_destroy

  tags = merge(local.default_tags, { "Enable-Backup" = var.enable_backups }, { "Enable-S3-Continuous-Backup" = var.enable_backups })
}

resource "aws_s3_bucket_ownership_controls" "reporting" {
  bucket = aws_s3_bucket.reporting.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reporting" {
  bucket = aws_s3_bucket.reporting.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = module.kms.key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "reporting" {
  bucket = aws_s3_bucket.reporting.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "reporting" {
  depends_on = [
    aws_s3_bucket_policy.reporting
  ]

  bucket = aws_s3_bucket.reporting.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "reporting" {
  bucket                = aws_s3_bucket.reporting.id
  expected_bucket_owner = var.aws_account_id

  rule {
    id     = "reporting"
    status = "Enabled"

    filter {
    }

    expiration {
      days = local.pii_retention_config.current_days
    }

    noncurrent_version_expiration {
      noncurrent_days = local.pii_retention_config.non_current_days
    }
  }
}

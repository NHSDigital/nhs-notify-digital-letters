resource "aws_s3_bucket_policy" "reporting" {
  bucket = aws_s3_bucket.reporting.id
  policy = data.aws_iam_policy_document.reporting.json
}

data "aws_iam_policy_document" "reporting" {
  statement {
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.reporting.arn,
      "${aws_s3_bucket.reporting.arn}/*",
    ]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values = [
        false
      ]
    }
  }
}

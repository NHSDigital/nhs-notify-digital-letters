resource "aws_sns_topic" "main" {
  name = "${local.csi}-test"
}

resource "aws_sns_topic_policy" "sns_publish" {
  arn    = aws_sns_topic.main.arn
  policy = data.aws_iam_policy_document.sns_topic_policy_document.json
}

data "aws_iam_policy_document" "sns_topic_policy_document" {
  statement {
    sid    = "AllowCrossDomainEventBridgeToPublishMessageToSNS"
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${var.shared_infra_account_id}:role/nhs-*-events-digital-letters-reporting",
        "arn:aws:sts::${var.shared_infra_account_id}:assumed-role/nhs-*-events-digital-letters-reporting/*"
      ]
    }

    actions = [
      "sns:Publish",
    ]

    resources = [
      aws_sns_topic.main.arn,
    ]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values = [
        "arn:aws:events:${var.region}:${var.shared_infra_account_id}:rule/*-data-plane*"
      ]
    }
  }
}

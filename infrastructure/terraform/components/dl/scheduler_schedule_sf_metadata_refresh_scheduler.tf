resource "aws_scheduler_schedule" "sf_metadata_refresh_scheduler" {
  name        = "${local.csi}-metadata-refresh-scheduler"
  description = "Scheduler to trigger Step Function to run metadata refresh queries"
  group_name  = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(10 6-22 * * ? *)"
  schedule_expression_timezone = "Europe/London"

  target {
    arn      = aws_sfn_state_machine.metadata_refresh.arn
    role_arn = aws_iam_role.sf_metadata_refresh_scheduler.arn
  }
}

resource "aws_iam_role" "sf_metadata_refresh_scheduler" {
  name               = "${local.csi}-sf-metadata-refresh-scheduler-role"
  description        = "Role used by the State Machine Metadata Refresh Scheduler"
  assume_role_policy = data.aws_iam_policy_document.metadata_refresh_scheduler_assumerole.json
}

data "aws_iam_policy_document" "metadata_refresh_scheduler_assumerole" {
  statement {
    sid    = "EcsAssumeRole"
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type = "Service"

      identifiers = [
        "scheduler.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role_policy_attachment" "sf_metadata_refresh_scheduler" {
  role       = aws_iam_role.sf_metadata_refresh_scheduler.name
  policy_arn = aws_iam_policy.sf_metadata_refresh_scheduler.arn
}

resource "aws_iam_policy" "sf_metadata_refresh_scheduler" {
  name        = "${local.csi}-sfn-metadata-refresh-scheduler-policy"
  description = "Allow Scheduler to execute State Machine"
  path        = "/"
  policy      = data.aws_iam_policy_document.sf_metadata_refresh_scheduler.json
}

data "aws_iam_policy_document" "sf_metadata_refresh_scheduler" {
  statement {
    sid    = "AllowStepFunctionExecution"
    effect = "Allow"

    actions = [
      "states:StartExecution"
    ]

    resources = [
      aws_sfn_state_machine.metadata_refresh.arn
    ]
  }
}

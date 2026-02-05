resource "aws_sfn_state_machine" "metadata_refresh" {
  name     = "${local.csi}-state-machine-metadata-refresh"
  role_arn = aws_iam_role.sfn_metadata_refresh.arn

  definition = jsonencode({
    "Comment" : "Workflow to update the metadata in the reporting tables.",
    "StartAt" : "Update Metadata",
    "States" : {
      "Update Metadata" : {
        "Type" : "Task",
        "Resource" : "arn:aws:states:::athena:startQueryExecution",
        "Parameters" : {
          "QueryString" : "MSCK REPAIR TABLE ${aws_glue_catalog_table.event_record.name}",
          "WorkGroup" : "${aws_athena_workgroup.reporting.name}",
          "QueryExecutionContext" : {
            "Database" : "${aws_glue_catalog_database.reporting.name}"
          }
        },
        "End" : true
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.reporting.arn}:*"
    include_execution_data = true
    level                  = "ERROR"
  }
}

resource "aws_cloudwatch_log_group" "reporting" {
  name              = "/aws/sfn-state-machine-metadata-refresh/${local.csi}"
  retention_in_days = var.log_retention_in_days
}

resource "aws_iam_role" "sfn_metadata_refresh" {
  name               = "${local.csi}-sf-metadata-refresh-role"
  description        = "Role used by the State Machine for Athena metadata refresh queries"
  assume_role_policy = data.aws_iam_policy_document.sfn_assumerole_metadata_refresh.json
}

data "aws_iam_policy_document" "sfn_assumerole_metadata_refresh" {
  statement {
    sid    = "StateMachineAssumeRole"
    effect = "Allow"

    actions = [
      "sts:AssumeRole"
    ]

    principals {
      type = "Service"

      identifiers = [
        "states.amazonaws.com",
        "glue.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role_policy_attachment" "sfn_metadata_refresh" {
  role       = aws_iam_role.sfn_metadata_refresh.name
  policy_arn = aws_iam_policy.sfn_metadata_refresh.arn
}

resource "aws_iam_policy" "sfn_metadata_refresh" {
  name        = "${local.csi}-sfn-metadata-refresh-policy"
  description = "Allow Step Function State Machine to run Athena metadata refresh queries"
  path        = "/"
  policy      = data.aws_iam_policy_document.sfn_metadata_refresh.json
}

data "aws_iam_policy_document" "sfn_metadata_refresh" {
  statement {
    sid    = "AllowAthena"
    effect = "Allow"

    actions = [
      "athena:startQueryExecution",
    ]

    resources = [
      aws_athena_workgroup.reporting.arn,
      "arn:aws:athena:${var.region}:${var.aws_account_id}:datacatalog/*"
    ]
  }

  statement {
    sid    = "AllowGlueCurrent"
    effect = "Allow"

    actions = [
      "glue:Get*",
      "glue:BatchCreatePartition"
    ]

    resources = [
      "arn:aws:glue:${var.region}:${var.aws_account_id}:catalog",
      aws_glue_catalog_database.reporting.arn,
      "arn:aws:glue:${var.region}:${var.aws_account_id}:table/${aws_glue_catalog_database.reporting.name}/*"
    ]
  }

  statement {
    sid    = "AllowS3Current"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:ListBucket",
      "s3:GetObject",
      "s3:GetBucketLocation",
      "s3:DescribeJob",
    ]

    resources = [
      module.s3bucket_reporting.arn,
      "${module.s3bucket_reporting.arn}/*"
    ]
  }

  statement {
    sid    = "AllowKMSCurrent"
    effect = "Allow"

    actions = [
      "kms:GenerateDataKey*",
      "kms:Encrypt",
      "kms:DescribeKey",
    ]

    resources = [
      module.kms.key_arn
    ]
  }

  statement {
    sid    = "AllowCloudwatchLogging"
    effect = "Allow"

    actions = [
      "logs:CreateLogDelivery",
      "logs:GetLogDelivery",
      "logs:UpdateLogDelivery",
      "logs:DeleteLogDelivery",
      "logs:ListLogDeliveries",
      "logs:PutResourcePolicy",
      "logs:DescribeResourcePolicies",
      "logs:DescribeLogGroups",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "*", # See https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html & https://github.com/aws/aws-cdk/issues/7158
    ]
  }
}

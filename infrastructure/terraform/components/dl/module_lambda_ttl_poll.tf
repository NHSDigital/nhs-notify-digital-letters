module "ttl_poll" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip"

  function_name = "ttl-poll"
  description   = "A function for deleting any overdue TTL records"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.ttl_poll_lambda.json
  }

  function_s3_bucket      = local.acct.s3_buckets["lambda_function_artefacts"]["id"]
  function_code_base_path = local.aws_lambda_functions_dir_path
  function_code_dir       = "ttl-poll-lambda/dist"
  function_include_common = true
  handler_function_name   = "handler"
  runtime                 = "nodejs22.x"
  memory                  = 128
  timeout                 = 360
  log_level               = var.log_level
  schedule                = var.ttl_poll_schedule

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  send_to_firehose          = true
  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    "TTL_TABLE_NAME"      = aws_dynamodb_table.ttl.name
    "CONCURRENCY"         = 60
    "MAX_PROCESS_SECONDS" = 300
    "TTL_SHARD_COUNT"     = local.ttl_shard_count
  }
}

data "aws_iam_policy_document" "ttl_poll_lambda" {
  statement {
    sid    = "AllowTtlDynamoAccess"
    effect = "Allow"

    actions = [
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]

    resources = [
      aws_dynamodb_table.ttl.arn,
      "${aws_dynamodb_table.ttl.arn}/index/dateOfExpiryIndex"
    ]
  }

  statement {
    sid    = "KMSPermissions"
    effect = "Allow"

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]

    resources = [
      module.kms.key_arn,
    ]
  }
}

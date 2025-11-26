module "mesh_poll" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip"

  function_name = "mesh-poll"
  description   = "A lambda function for polling MESH inbox for new messages"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.mesh_poll_lambda.json
  }

  function_s3_bucket      = local.acct.s3_buckets["lambda_function_artefacts"]["id"]
  function_code_base_path = local.aws_lambda_functions_dir_path
  function_code_dir       = "mesh-poll/target/dist"
  function_include_common = true
  handler_function_name   = "mesh_poll.handler.handler"
  runtime                 = "python3.9"
  memory                  = 128
  timeout                 = 5
  log_level               = var.log_level
  schedule                = var.mesh_poll_schedule

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  send_to_firehose          = true
  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    # Required by Config
    SSM_PREFIX                          = var.ssm_prefix
    SSM_CLIENTS_PARAMETER_PATH          = var.ssm_clients_parameter_path
    INBOX_WORKFLOW_ID                   = var.inbox_workflow_id
    OUTBOX_WORKFLOW_ID                  = var.outbox_workflow_id
    MAXIMUM_RUNTIME_MILLISECONDS        = var.maximum_runtime_milliseconds
    ENVIRONMENT                         = var.environment
    EVENT_PUBLISHER_EVENT_BUS_ARN       = aws_cloudwatch_event_bus.main.arn
    CERTIFICATE_EXPIRY_METRIC_NAME      = var.certificate_expiry_metric_name
    CERTIFICATE_EXPIRY_METRIC_NAMESPACE = var.certificate_expiry_metric_namespace
    POLLING_METRIC_NAME                 = var.polling_metric_name
    POLLING_METRIC_NAMESPACE            = var.polling_metric_namespace

    # Optional
    USE_MESH_MOCK                       = var.enable_mock_mesh ? "true" : "false"
    MOCK_MESH_BUCKET                    = module.s3bucket_non_pii_data.bucket
  }

}

data "aws_iam_policy_document" "mesh_poll_lambda" {
  # Mock S3 ListBucket only when enabled
  dynamic "statement" {
    for_each = var.enable_mock_mesh ? [1] : []
    content {
      sid    = "MockMeshListBucket"
      effect = "Allow"

      actions = [
        "s3:ListBucket"
      ]

      resources = [
        module.s3bucket_non_pii_data.arn
      ]

      condition {
        test     = "StringLike"
        variable = "s3:prefix"
        values   = ["mock-mesh/*"]
      }
    }
  }

  # Mock S3 GetObject only when enabled
  dynamic "statement" {
    for_each = var.enable_mock_mesh ? [1] : []
    content {
      sid    = "MockMeshGetObject"
      effect = "Allow"

      actions = [
        "s3:GetObject"
      ]

      resources = [
        "${module.s3bucket_non_pii_data.arn}/mock-mesh/*"
      ]
    }
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

module "pdm_mock_lambda" {
  count  = local.deploy_pdm_mock ? 1 : 0
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip"

  function_name = "pdm-mock-lambda"
  description   = "A lambda function for mocking PDM (Patient Data Manager) API endpoints"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.pdm_mock_lambda[0].json
  }

  function_s3_bucket      = local.acct.s3_buckets["lambda_function_artefacts"]["id"]
  function_code_base_path = local.aws_lambda_functions_dir_path
  function_code_dir       = "pdm-mock-lambda/dist"
  function_include_common = true
  handler_function_name   = "handler"
  runtime                 = "nodejs22.x"
  memory                  = 128
  timeout                 = 30
  log_level               = var.log_level

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  send_to_firehose          = true
  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    MOCK_ACCESS_TOKEN     = var.pdm_mock_access_token
    ACCESS_TOKEN_SSM_PATH = local.apim_access_token_ssm_parameter_name
    USE_NON_MOCK_TOKEN    = var.pdm_use_non_mock_token
  }
}

data "aws_iam_policy_document" "pdm_mock_lambda" {
  count = local.deploy_pdm_mock ? 1 : 0

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

  statement {
    sid    = "SSMParameterAccess"
    effect = "Allow"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]

    resources = [
      "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter${local.apim_access_token_ssm_parameter_name}",
    ]
  }
}

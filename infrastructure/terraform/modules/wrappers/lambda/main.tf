# Wrapper module for lambda - centralizes the source version
# To update the module version, change the source URL below
module "lambda" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.30/terraform-lambda.zip"

  function_name             = var.function_name
  description               = var.description
  aws_account_id            = var.aws_account_id
  component                 = var.component
  environment               = var.environment
  project                   = var.project
  region                    = var.region
  group                     = var.group
  log_retention_in_days     = var.log_retention_in_days
  kms_key_arn               = var.kms_key_arn
  iam_policy_document       = var.iam_policy_document
  function_s3_bucket        = var.function_s3_bucket
  function_code_base_path   = var.function_code_base_path
  function_code_dir         = var.function_code_dir
  function_include_common   = var.function_include_common
  function_module_name      = var.function_module_name
  handler_function_name     = var.handler_function_name
  runtime                   = var.runtime
  memory                    = var.memory
  timeout                   = var.timeout
  log_level                 = var.log_level
  schedule                  = try(var.schedule, null)
  force_lambda_code_deploy  = var.force_lambda_code_deploy
  enable_lambda_insights    = var.enable_lambda_insights
  log_destination_arn       = var.log_destination_arn
  log_subscription_role_arn = var.log_subscription_role_arn
  lambda_env_vars           = try(var.lambda_env_vars, {})
}

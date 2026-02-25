# Variables for lambda wrapper module
# These mirror the variables from the upstream nhs-notify-shared-modules lambda module

variable "function_name" {
  type        = string
  description = "The name of the Lambda function"
}

variable "description" {
  type        = string
  description = "Description of the Lambda function"
}

variable "aws_account_id" {
  type        = string
  description = "AWS Account ID"
}

variable "component" {
  type        = string
  description = "Component name"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "project" {
  type        = string
  description = "Project name"
}

variable "region" {
  type        = string
  description = "AWS Region"
}

variable "group" {
  type        = string
  description = "Group name"
}

variable "log_retention_in_days" {
  type        = number
  description = "CloudWatch log retention in days"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for encryption"
}

variable "iam_policy_document" {
  type        = any
  description = "IAM policy document for the Lambda execution role"
}

variable "function_s3_bucket" {
  type        = string
  description = "S3 bucket containing the Lambda function code"
}

variable "function_code_base_path" {
  type        = string
  description = "Base path for Lambda function code"
}

variable "function_code_dir" {
  type        = string
  description = "Directory containing the Lambda function code"
}

variable "function_include_common" {
  type        = bool
  description = "Whether to include common code"
}

variable "function_module_name" {
  type        = string
  description = "Module name for the function"
}

variable "handler_function_name" {
  type        = string
  description = "Handler function name"
}

variable "runtime" {
  type        = string
  description = "Lambda runtime (e.g., nodejs22.x, python3.12)"
}

variable "memory" {
  type        = number
  description = "Memory allocation for the Lambda function in MB"
}

variable "timeout" {
  type        = number
  description = "Timeout for the Lambda function in seconds"
}

variable "log_level" {
  type        = string
  description = "Log level for the Lambda function"
}

variable "schedule" {
  type        = string
  description = "CloudWatch Events schedule expression (optional)"
  default     = null
}

variable "force_lambda_code_deploy" {
  type        = bool
  description = "Force deployment of Lambda code"
}

variable "enable_lambda_insights" {
  type        = bool
  description = "Enable Lambda Insights"
}

variable "log_destination_arn" {
  type        = string
  description = "ARN of the log destination"
}

variable "log_subscription_role_arn" {
  type        = string
  description = "ARN of the role for log subscription"
}

variable "lambda_env_vars" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  default     = {}
}

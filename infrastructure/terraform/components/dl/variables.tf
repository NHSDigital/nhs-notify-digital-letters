##
# Basic Required Variables for tfscaffold Components
##

variable "project" {
  type        = string
  description = "The name of the tfscaffold project"
}

variable "environment" {
  type        = string
  description = "The name of the tfscaffold environment"
}

variable "aws_account_id" {
  type        = string
  description = "The AWS Account ID (numeric)"
}

variable "shared_infra_account_id" {
  type        = string
  description = "The AWS Shared Infra Account ID (numeric)"
}

variable "region" {
  type        = string
  description = "The AWS Region"
}

variable "group" {
  type        = string
  description = "The group variables are being inherited from (often synonmous with account short-name)"
}

##
# tfscaffold variables specific to this component
##

# This is the only primary variable to have its value defined as
# a default within its declaration in this file, because the variables
# purpose is as an identifier unique to this component, rather
# then to the environment from where all other variables come.
variable "component" {
  type        = string
  description = "The variable encapsulating the name of this component"
  default     = "dl"
}

variable "default_tags" {
  type        = map(string)
  description = "A map of default tags to apply to all taggable resources within the component"
  default     = {}
}

##
# Variables specific to the component
##

variable "log_retention_in_days" {
  type        = number
  description = "The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite"
  default     = 0
}

variable "kms_deletion_window" {
  type        = string
  description = "When a kms key is deleted, how long should it wait in the pending deletion state?"
  default     = "30"
}

variable "log_level" {
  type        = string
  description = "The log level to be used in lambda functions within the component. Any log with a lower severity than the configured value will not be logged: https://docs.python.org/3/library/logging.html#levels"
  default     = "INFO"
}

variable "force_lambda_code_deploy" {
  type        = bool
  description = "If the lambda package in s3 has the same commit id tag as the terraform build branch, the lambda will not update automatically. Set to True if making changes to Lambda code from on the same commit for example during development"
  default     = false
}

variable "parent_acct_environment" {
  type        = string
  description = "Name of the environment responsible for the acct resources used, affects things like DNS zone. Useful for named dev environments"
  default     = "main"
}

variable "mesh_poll_schedule" {
  type        = string
  description = "Schedule to poll MESH for messages"
  default     = "rate(5 minutes)" # Every 5 minutes
}

variable "enable_mock_mesh" {
  description = "Enable mock mesh access (dev only). Grants lambda permission to read mock-mesh prefix in non-pii bucket."
  type        = bool
  default     = false
}

variable "queue_batch_size" {
  type        = number
  description = "maximum number of queue items to process"
  default     = 10
}

variable "queue_batch_window_seconds" {
  type        = number
  description = "maximum time in seconds between processing events"
  default     = 1
}

variable "enable_dynamodb_delete_protection" {
  type        = bool
  description = "Enable DynamoDB Delete Protection on all Tables"
  default     = true
}

variable "ttl_poll_schedule" {
  type        = string
  description = "Schedule to poll for any overdue TTL records"
  default     = "rate(10 minutes)" # Every 10 minutes
}

variable "pdm_mock_access_token" {
  type        = string
  description = "Mock access token for PDM API authentication (used in local/dev environments)"
  default     = "mock-pdm-token"
}

variable "pdm_use_non_mock_token" {
  type        = bool
  description = "Whether to use the shared APIM access token from SSM (/component/environment/apim/access_token) instead of the mock token"
  default     = false
}

variable "apim_base_url" {
  type        = string
  description = "The URL used to send requests to PDM"
  default     = "https://int.api.service.nhs.uk"
}

variable "core_notify_url" {
  type        = string
  description = "The URL used to send requests to Notify"
  default     = "https://sandbox.api.service.nhs.uk"
}

variable "apim_auth_token_url" {
  type        = string
  description = "URL to generate an APIM auth token"
  default     = "https://int.api.service.nhs.uk/oauth2/token"
}

variable "apim_keygen_schedule" {
  type        = string
  description = "Schedule to refresh key pairs if necessary"
  default     = "cron(0 14 * * ? *)"
}

variable "apim_auth_token_schedule" {
  type        = string
  description = "Schedule to renew the APIM auth token"
  default     = "rate(9 minutes)"
}

variable "force_destroy" {
  type        = bool
  description = "Flag to force deletion of S3 buckets"
  default     = false

  validation {
    condition     = !(var.force_destroy && var.environment == "prod")
    error_message = "force_destroy must not be set to true when environment is 'prod'."
  }
}

variable "enable_pdm_mock" {
  type        = bool
  description = "Flag indicating whether to deploy PDM mock API (should be false in production environments)"
  default     = true
}

variable "pii_data_retention_policy_days" {
  type        = number
  description = "The number of days for data retention policy for PII"
  default     = 534
}

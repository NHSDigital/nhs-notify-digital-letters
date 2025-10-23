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
  default     = "cron(0,30 8-16 ? * MON-FRI *)"  # Every 30 minutes between 8am and 4:30pm Mon-Fri
}

variable "queue_batch_size" {
  type        = number
  description = "maximum number of queue items to process"
  default     = 10
}

variable "queue_batch_window_seconds" {
  type        = number
  description = "maximum time in seconds between processing events"
  default     = 10
}

variable "enable_dynamodb_delete_protection" {
  type        = bool
  description = "Enable DynamoDB Delete Protection on all Tables"
  default     = true
}

variable "ttl_poll_schedule" {
  type        = string
  description = "Schedule to poll for any overdue TTL records"
  default     = "rate(10 minutes)"  # Every 10 minutes
}

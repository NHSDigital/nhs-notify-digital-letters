# Outputs from lambda wrapper module
# These expose the outputs from the upstream nhs-notify-shared-modules lambda module

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = module.lambda.function_arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = module.lambda.function_name
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = module.lambda.role_arn
}

output "role_name" {
  description = "Name of the Lambda execution role"
  value       = module.lambda.role_name
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = module.lambda.log_group_name
}

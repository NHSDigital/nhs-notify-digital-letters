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

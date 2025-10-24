locals {
  aws_lambda_functions_dir_path = "../../../../lambdas"
  log_destination_arn           = "arn:aws:logs:${var.region}:${var.shared_infra_account_id}:destination:nhs-main-obs-firehose-logs"

  ttl_shard_count = 3
}

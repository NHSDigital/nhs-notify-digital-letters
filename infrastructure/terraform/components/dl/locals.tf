locals {
  apim_access_token_ssm_parameter_name = "/${var.component}/${var.environment}/apim/access_token"
  apim_api_key_ssm_parameter_name      = "/${var.component}/${var.environment}/apim/api_key"
  apim_keystore_s3_bucket              = "nhs-${var.aws_account_id}-${var.region}-${var.environment}-${var.component}-static-assets"
  apim_private_key_ssm_parameter_name  = "/${var.component}/${var.environment}/apim/private_key"
  athena_reporting_database            = "${local.csi}-reporting"
  athena_workgroup_arn                 = "arn:aws:athena:${var.region}:${var.aws_account_id}:workgroup/${aws_athena_workgroup.reporting.name}"
  aws_lambda_functions_dir_path        = "../../../../lambdas"
  deploy_pdm_mock                      = var.enable_pdm_mock
  firehose_output_path_prefix          = "kinesis-firehose-output"
  log_destination_arn                  = "arn:aws:logs:${var.region}:${var.shared_infra_account_id}:destination:nhs-main-obs-firehose-logs"
  mock_mesh_endpoint                   = "s3://${module.s3bucket_non_pii_data.bucket}/mock-mesh"
  pii_retention_config = {
    current_days     = var.pii_data_retention_policy_days,
    non_current_days = 14
  }
  root_domain_id         = local.acct.route53_zone_ids["digital-letters"]
  root_domain_name       = "${var.environment}.${local.acct.route53_zone_names["digital-letters"]}"
  ssm_mesh_prefix        = "${local.ssm_prefix}/mesh"
  ssm_prefix             = "/${var.component}/${var.environment}"
  ssm_senders_prefix     = "${local.ssm_prefix}/senders"
  ttl_shard_count        = 3
  unscanned_files_bucket = local.acct.additional_s3_buckets["digital-letters_unscanned-files"]["id"]
}

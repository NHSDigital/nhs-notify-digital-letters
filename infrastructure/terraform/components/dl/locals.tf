locals {
  aws_lambda_functions_dir_path        = "../../../../lambdas"
  log_destination_arn                  = "arn:aws:logs:${var.region}:${var.shared_infra_account_id}:destination:nhs-main-obs-firehose-logs"
  apim_access_token_ssm_parameter_name = "/${var.component}/${var.environment}/apim/access_token"
  apim_api_key_ssm_parameter_name      = "/${var.component}/${var.environment}/apim/api_key"
  apim_private_key_ssm_parameter_name  = "/${var.component}/${var.environment}/apim/private_key"
  apim_keystore_s3_bucket              = "nhs-${var.aws_account_id}-${var.region}-${var.environment}-${var.component}-static-assets"
  ssm_mesh_prefix                      = "/${var.component}/${var.environment}"
  mock_mesh_endpoint                   = "s3://${module.s3bucket_non_pii_data.bucket}/mock-mesh"
  root_domain_name                     = "${var.environment}.${local.acct.route53_zone_names["digital-letters"]}"
  root_domain_id                       = local.acct.route53_zone_ids["digital-letters"]
  ttl_shard_count                      = 3
  deploy_pdm_mock                      = var.enable_pdm_mock
}

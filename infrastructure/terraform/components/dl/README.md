<!-- BEGIN_TF_DOCS -->
<!-- markdownlint-disable -->
<!-- vale off -->

## Requirements

No requirements.
## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_aws_account_id"></a> [aws\_account\_id](#input\_aws\_account\_id) | The AWS Account ID (numeric) | `string` | n/a | yes |
| <a name="input_component"></a> [component](#input\_component) | The variable encapsulating the name of this component | `string` | `"dl"` | no |
| <a name="input_default_tags"></a> [default\_tags](#input\_default\_tags) | A map of default tags to apply to all taggable resources within the component | `map(string)` | `{}` | no |
| <a name="input_enable_dynamodb_delete_protection"></a> [enable\_dynamodb\_delete\_protection](#input\_enable\_dynamodb\_delete\_protection) | Enable DynamoDB Delete Protection on all Tables | `bool` | `true` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | The name of the tfscaffold environment | `string` | n/a | yes |
| <a name="input_force_lambda_code_deploy"></a> [force\_lambda\_code\_deploy](#input\_force\_lambda\_code\_deploy) | If the lambda package in s3 has the same commit id tag as the terraform build branch, the lambda will not update automatically. Set to True if making changes to Lambda code from on the same commit for example during development | `bool` | `false` | no |
| <a name="input_group"></a> [group](#input\_group) | The group variables are being inherited from (often synonmous with account short-name) | `string` | n/a | yes |
| <a name="input_kms_deletion_window"></a> [kms\_deletion\_window](#input\_kms\_deletion\_window) | When a kms key is deleted, how long should it wait in the pending deletion state? | `string` | `"30"` | no |
| <a name="input_log_level"></a> [log\_level](#input\_log\_level) | The log level to be used in lambda functions within the component. Any log with a lower severity than the configured value will not be logged: https://docs.python.org/3/library/logging.html#levels | `string` | `"INFO"` | no |
| <a name="input_log_retention_in_days"></a> [log\_retention\_in\_days](#input\_log\_retention\_in\_days) | The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite | `number` | `0` | no |
| <a name="input_mesh_poll_schedule"></a> [mesh\_poll\_schedule](#input\_mesh\_poll\_schedule) | Schedule to poll MESH for messages | `string` | `"cron(0,30 8-16 ? * MON-FRI *)"` | no |
| <a name="input_parent_acct_environment"></a> [parent\_acct\_environment](#input\_parent\_acct\_environment) | Name of the environment responsible for the acct resources used, affects things like DNS zone. Useful for named dev environments | `string` | `"main"` | no |
| <a name="input_project"></a> [project](#input\_project) | The name of the tfscaffold project | `string` | n/a | yes |
| <a name="input_queue_batch_size"></a> [queue\_batch\_size](#input\_queue\_batch\_size) | maximum number of queue items to process | `number` | `10` | no |
| <a name="input_queue_batch_window_seconds"></a> [queue\_batch\_window\_seconds](#input\_queue\_batch\_window\_seconds) | maximum time in seconds between processing events | `number` | `10` | no |
| <a name="input_region"></a> [region](#input\_region) | The AWS Region | `string` | n/a | yes |
| <a name="input_shared_infra_account_id"></a> [shared\_infra\_account\_id](#input\_shared\_infra\_account\_id) | The AWS Shared Infra Account ID (numeric) | `string` | n/a | yes |
| <a name="input_ttl_poll_schedule"></a> [ttl\_poll\_schedule](#input\_ttl\_poll\_schedule) | Schedule to poll for any overdue TTL records | `string` | `"rate(10 minutes)"` | no |
## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_kms"></a> [kms](#module\_kms) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-kms.zip | n/a |
| <a name="module_mesh_poll"></a> [mesh\_poll](#module\_mesh\_poll) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip | n/a |
| <a name="module_s3bucket_letters"></a> [s3bucket\_letters](#module\_s3bucket\_letters) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-s3bucket.zip | n/a |
| <a name="module_sqs_ttl"></a> [sqs\_ttl](#module\_sqs\_ttl) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-sqs.zip | n/a |
| <a name="module_ttl_create"></a> [ttl\_create](#module\_ttl\_create) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip | n/a |
| <a name="module_ttl_poll"></a> [ttl\_poll](#module\_ttl\_poll) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/v2.0.24/terraform-lambda.zip | n/a |
## Outputs

| Name | Description |
|------|-------------|
| <a name="output_deployment"></a> [deployment](#output\_deployment) | Deployment details used for post-deployment scripts |
<!-- vale on -->
<!-- markdownlint-enable -->
<!-- END_TF_DOCS -->

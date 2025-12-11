// Envar Based
// Environment Configuration
export const ENV = process.env.ENVIRONMENT || 'main';
export const REGION = process.env.AWS_REGION || 'eu-west-2';
export const { AWS_ACCOUNT_ID } = process.env;

// Compound Scope Indicator
export const CSI = `nhs-${ENV}-dl`;

// Lambda Names
export const MESH_POLL_LAMBDA_NAME = `${CSI}-mesh-poll`;
export const TTL_CREATE_LAMBDA_NAME = `${CSI}-ttl-create`;
export const TTL_POLL_LAMBDA_NAME = `${CSI}-ttl-poll`;
export const REPLACEWITH_COMPONENT_NAME_LAMBDA_NAME = `${CSI}-replacewith_component-name`;

// Queue Names
export const TTL_QUEUE_NAME = `${CSI}-ttl-queue`;
export const TTL_DLQ_NAME = `${CSI}-ttl-dlq`;
export const PDM_UPLOADER_DLQ_NAME = `${CSI}-pdm-uploader-dlq`;
export const PDM_POLL_DLQ_NAME = `${CSI}-pdm-poll-dlq`;
export const REPLACEWITH_COMPONENT_NAME_DLQ_NAME = `${CSI}-replacewith_component-name-dlq`;

// Queue Url Prefix
export const SQS_URL_PREFIX = `https://sqs.${REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/`;

// Event Bus
export const EVENT_BUS_ARN = `arn:aws:events:${REGION}:${AWS_ACCOUNT_ID}:event-bus/${CSI}`;
export const EVENT_BUS_DLQ_URL = `${SQS_URL_PREFIX}${CSI}-event-publisher-errors-queue`;
export const EVENT_BUS_LOG_GROUP_NAME = `/aws/vendedlogs/events/event-bus/${CSI}`;

// DynamoDB
export const TTL_TABLE_NAME = `${CSI}-ttl`;

// S3
export const LETTERS_S3_BUCKET_NAME = `nhs-${process.env.AWS_ACCOUNT_ID}-${REGION}-${ENV}-dl-letters`;

// Cloudwatch
export const PDM_UPLOADER_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-pdm-uploader`;
export const PDM_POLL_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-pdm-poll`;
export const REPLACEWITH_COMPONENT_NAME_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-replacewith_component-name`;

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
export const CORE_NOTIFIER_LAMBDA_NAME = `${CSI}-core-notifier`;

// Queue Names
export const TTL_QUEUE_NAME = `${CSI}-ttl-queue`;
export const TTL_DLQ_NAME = `${CSI}-ttl-dlq`;
export const PDM_UPLOADER_DLQ_NAME = `${CSI}-pdm-uploader-dlq`;
export const PDM_POLL_DLQ_NAME = `${CSI}-pdm-poll-dlq`;
export const CORE_NOTIFIER_DLQ_NAME = `${CSI}-core-notifier-dlq`;
export const FILE_SCANNER_DLQ_NAME = `${CSI}-scanner-dlq`;
export const MOVE_SCANNED_FILES_NAME = `${CSI}-move-scanned-files-queue`;
export const MOVE_SCANNED_FILES_DLQ_NAME = `${CSI}-move-scanned-files-dlq`;

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
export const UNSCANNED_FILES_S3_BUCKET_NAME = `nhs-${process.env.AWS_ACCOUNT_ID}-${REGION}-main-acct-digi-unscanned-files`;
export const FILE_SAFE_S3_BUCKET_NAME = `nhs-${process.env.AWS_ACCOUNT_ID}-${REGION}-${ENV}-dl-file-safe`;
export const FILE_QUARANTINE_S3_BUCKET_NAME = `nhs-${process.env.AWS_ACCOUNT_ID}-${REGION}-${ENV}-dl-file-quarantine`;
// Files that are scanned by Guardduty are in a bucket prefixed by the environment.
export const PREFIX_DL_FILES = `${ENV}/`;

// Cloudwatch
export const PDM_UPLOADER_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-pdm-uploader`;
export const PDM_POLL_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-pdm-poll`;
export const CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-core-notifier`;
export const FILE_SCANNER_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-file-scanner`;
export const MOVE_SCANNED_FILES_LAMBDA_LOG_GROUP_NAME = `/aws/lambda/${CSI}-move-scanned-files`;

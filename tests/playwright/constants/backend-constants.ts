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

// Queue Names
export const TTL_QUEUE_NAME = `${CSI}-ttl-queue`;
export const TTL_DLQ_NAME = `${CSI}-ttl-dlq`;

// Queue Url Prefix
export const SQS_URL_PREFIX = `https://sqs.${REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/`;

// Event Bus
export const EVENT_BUS_ARN = `arn:aws:events:${REGION}:${AWS_ACCOUNT_ID}:event-bus/${CSI}`;
export const EVENT_BUS_DLQ_URL = `${SQS_URL_PREFIX}${CSI}-event-publisher-errors-queue`;

// DynamoDB
export const TTL_TABLE_NAME = `${CSI}-ttl`;

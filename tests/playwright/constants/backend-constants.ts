// Envar Based
// Environment Configuration
export const ENV = process.env.ENVIRONMENT || 'main';

// Compound Scope Indicator
export const CSI = `nhs-${ENV}-dl`;

// Lambda Names
export const MESH_POLL_LAMBDA_NAME = `${CSI}-mesh-poll`;
export const TTL_CREATE_LAMBDA_NAME = `${CSI}-ttl-create`;
export const TTL_POLL_LAMBDA_NAME = `${CSI}-ttl-poll`;

// Queue Names
export const TTL_QUEUE_NAME = `${CSI}-ttl-queue`;
export const TTL_DLQ_NAME = `${CSI}-ttl-dlq`;

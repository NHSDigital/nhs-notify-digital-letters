# PDM Mock API Lambda

This Lambda function provides a mock implementation of the PDM (Patient Data Manager) API for testing purposes. It allows the NHS Notify Digital Letters system to test integration with PDM without requiring access to the actual PDM service.

## Overview

The PDM Mock API simulates two key PDM endpoints:

- **POST /resource** - Create a new resource
- **GET /resource/{id}** - Retrieve a specific resource

The mock includes the same authentication mechanism used in the PDS mock, requiring a Bearer token in the Authorization header.

## Features

- ✅ Authentication using Bearer tokens (configurable for mock or SSM-stored tokens)
- ✅ GET endpoint to retrieve resources by ID
- ✅ POST endpoint to create new resources
- ✅ Supports successful responses (200 OK, 201 Created)
- ✅ Supports empty responses for testing
- ✅ Configurable error responses (4XX, 5XX) for testing error scenarios
- ✅ FHIR-compliant response format with OperationOutcome for errors
- ✅ Comprehensive logging with structured log fields
- ✅ API Gateway integration with CloudWatch logging

## API Endpoints

### POST /resource

Creates a new PDM resource.

**Request:**

```bash
curl -X POST https://<api-gateway-url>/resource \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"id": "custom-id"}'
```

**Response (201 Created):**

```json
{
  "resourceType": "CommunicationRequest",
  "id": "custom-id",
  "status": "active",
  "created": "2025-11-24T12:00:00Z",
  "subject": {
    "reference": "Patient/custom-id"
  },
  "payload": [
    {
      "contentString": "Mock PDM resource content"
    }
  ]
}
```

### GET /resource/{id}

Retrieves a specific PDM resource by ID.

**Request:**

```bash
curl https://<api-gateway-url>/resource/test-id \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "resourceType": "CommunicationRequest",
  "id": "test-id",
  "status": "active",
  "created": "2025-11-24T12:00:00Z",
  "subject": {
    "reference": "Patient/test-id"
  },
  "payload": [
    {
      "contentString": "Mock PDM resource content"
    }
  ]
}
```

## Error Scenarios

The mock API supports triggering specific error responses for testing. Use these special resource IDs:

| Resource ID              | Status Code | Error Code          | Description                     |
| ------------------------ | ----------- | ------------------- | ------------------------------- |
| `error-400-invalid`      | 400         | INVALID_VALUE       | Invalid resource value          |
| `error-401-unauthorized` | 401         | UNAUTHORISED        | Unauthorized access             |
| `error-403-forbidden`    | 403         | FORBIDDEN           | Access forbidden                |
| `error-404-notfound`     | 404         | RESOURCE_NOT_FOUND  | Resource not found              |
| `error-409-conflict`     | 409         | CONFLICT            | Resource already exists         |
| `error-429-ratelimit`    | 429         | TOO_MANY_REQUESTS   | Rate limit exceeded             |
| `error-500-internal`     | 500         | INTERNAL_ERROR      | Internal server error           |
| `error-503-unavailable`  | 503         | SERVICE_UNAVAILABLE | Service temporarily unavailable |
| `empty-response`         | 200         | -                   | Empty success response          |

**Example - Trigger 404 Error:**

```bash
curl https://<api-gateway-url>/resource/error-404-notfound \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "unknown",
      "details": {
        "coding": [{ "code": "RESOURCE_NOT_FOUND" }]
      },
      "diagnostics": "Resource not found"
    }
  ]
}
```

## Configuration

The lambda is configured via environment variables:

| Variable                | Description                              | Default                    |
| ----------------------- | ---------------------------------------- | -------------------------- |
| `MOCK_ACCESS_TOKEN`     | Token to use in local/dev environments   | `mock-token-for-local-dev` |
| `ACCESS_TOKEN_SSM_PATH` | SSM parameter path for the access token  | `/mock/access-token`       |
| `USE_NON_MOCK_TOKEN`    | Use SSM token instead of mock token      | `false`                    |
| `LOG_LEVEL`             | Logging level (DEBUG, INFO, WARN, ERROR) | `INFO`                     |

## Development

### Prerequisites

- Node.js 22.x
- pnpm (for workspace management)
- AWS CLI configured

### Install Dependencies

```bash
cd lambdas/pdm-mock-api
npm install
```

### Build

```bash
npm run build
```

This creates an optimized bundle in the `dist/` directory.

### Run Tests

```bash
npm run test:unit
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

## Deployment

The lambda is deployed via Terraform in the Digital Letters infrastructure.

### Terraform Resources

- **Lambda Function**: `module.pdm_mock_api`
- **API Gateway**: `aws_api_gateway_rest_api.pdm_mock`
- **Lambda IAM Permissions**: SSM parameter access, KMS encryption

### Deploy to dev

```bash
cd infrastructure/terraform
# Follow standard tfscaffold deployment process
./bin/terraform.sh <account> <region> <env> dl plan
./bin/terraform.sh <account> <region> <env> dl apply
```

### Access the API

After deployment, the API Gateway endpoint URL is available as a Terraform output:

```bash
terraform output pdm_mock_api_endpoint
```

### Key Components

1. **Authenticator** (`src/authenticator.ts`)
   - Validates Bearer tokens
   - Supports mock tokens and SSM-stored tokens

2. **Handlers** (`src/handlers.ts`)
   - `createGetResourceHandler`: Handles GET requests
   - `createCreateResourceHandler`: Handles POST requests
   - Generates mock FHIR resources
   - Supports error scenario triggers

3. **Container** (`src/container.ts`)
   - Dependency injection container
   - Manages configuration and service instances

4. **Index** (`src/index.ts`)
   - Main Lambda handler
   - Routes requests to appropriate handlers
   - Error handling

## Testing Integration

Example using the mock in integration tests:

```typescript
const pdmMockEndpoint = process.env.PDM_MOCK_ENDPOINT;
const token = process.env.PDM_MOCK_TOKEN || "mock-pdm-token";

// Create a resource
const response = await fetch(`${pdmMockEndpoint}/resource`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ id: "test-resource" }),
});

// Get the resource
const getResponse = await fetch(`${pdmMockEndpoint}/resource/test-resource`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Test error scenario
const errorResponse = await fetch(
  `${pdmMockEndpoint}/resource/error-500-internal`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

## Logging

The lambda uses structured logging with the following fields:

- `requestId`: API Gateway request ID for correlation
- `resourceId`: Resource identifier being accessed
- `httpMethod`: HTTP method (GET, POST)
- `path`: Request path
- `statusCode`: Response status code
- `error`: Error details (for error scenarios)

Example log entry:

```json
{
  "level": "INFO",
  "timestamp": "2025-11-24T12:00:00Z",
  "requestId": "abc-123",
  "httpMethod": "GET",
  "resourceId": "test-id",
  "message": "GET resource request received"
}
```

## Security Considerations

- The mock uses Bearer token authentication
- In production-like environments, use SSM parameters for tokens (`USE_NON_MOCK_TOKEN=true`)
- API Gateway logs are encrypted with KMS
- Lambda IAM role has least-privilege permissions
- X-Ray tracing enabled for request tracking

## Support

For issues or questions:

- Check the [main repository documentation](../../README.md)
- Review CloudWatch logs for the lambda function
- Check API Gateway access logs for request details

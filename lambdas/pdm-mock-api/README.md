# PDM Mock API Lambda

This Lambda function provides a mock implementation of the PDM (Patient Data Manager) API for testing purposes. It allows the NHS Notify Digital Letters system to test integration with PDM without requiring access to the actual PDM service.

## Overview

The PDM Mock API simulates two key PDM endpoints following the FHIR R4 DocumentReference structure:

- **POST /patient-data-manager/FHIR/R4/DocumentReference** - Create a new DocumentReference
- **GET /patient-data-manager/FHIR/R4/DocumentReference/{id}** - Retrieve a specific DocumentReference

The mock includes the same authentication mechanism used in the PDS mock, requiring a Bearer token in the Authorization header.

## API Endpoints

### POST /patient-data-manager/FHIR/R4/DocumentReference

Creates a new PDM DocumentReference.

**Request:**

```bash
curl -X POST https://<api-gateway-url>/patient-data-manager/FHIR/R4/DocumentReference \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"id": "custom-id"}'
```

**Response (201 Created):**

```json
{
  "resourceType": "DocumentReference",
  "id": "c7a74264-cf34-31b1-a395-811fa375cec6",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2025-11-26T16:50:48.338244Z"
  },
  "status": "current",
  "subject": {
    "identifier": {
      "system": "https://fhir.nhs.uk/Id/nhs-number",
      "value": "9912003071"
    }
  },
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "title": "Dummy PDF"
      }
    }
  ]
}
```

### GET /patient-data-manager/FHIR/R4/DocumentReference/{id}

Retrieves a specific PDM DocumentReference by ID.

**Request:**

```bash
curl https://<api-gateway-url>/patient-data-manager/FHIR/R4/DocumentReference/test-id \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "resourceType": "DocumentReference",
  "id": "848b67ea-eeaa-3620-a388-e4e8594ff2e3",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2025-11-26T11:23:57.591072Z"
  },
  "status": "current",
  "subject": {
    "identifier": {
      "system": "https://fhir.nhs.uk/Id/nhs-number",
      "value": "9912003071"
    }
  },
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "data": "XYZ",
        "title": "Dummy PDF"
      }
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

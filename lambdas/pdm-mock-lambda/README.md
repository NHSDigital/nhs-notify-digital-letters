# PDM Mock

This Lambda function provides a mock implementation of the PDM (Patient Data Manager) API for testing purposes. It allows the NHS Notify Digital Letters system to test integration with PDM without requiring access to the actual PDM service.

## Overview

The PDM Mock Lambda simulates two key PDM endpoints following the FHIR R4 DocumentReference structure:

- **POST /patient-data-manager/FHIR/R4/DocumentReference** - Create a new DocumentReference
- **GET /patient-data-manager/FHIR/R4/DocumentReference/{id}** - Retrieve a specific DocumentReference

## API Endpoints

### POST /patient-data-manager/FHIR/R4/DocumentReference

Creates a new PDM DocumentReference.

**Request:**

```bash
curl -X POST https://<api-gateway-url>/patient-data-manager/FHIR/R4/DocumentReference \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/fhir+json" \
  -H "X-Request-ID: 4a0e5f18-1747-4438-ac52-5ba2c21575f5" \
  -d '{}'
```

**Headers:**

- `Authorization: Bearer <token>` - Authentication token is not validated and can be any string value.
- `Content-Type: application/fhir+json` - Required content type.
- `X-Request-ID: <UUID>` - This uuid will be used as the DocumentReference `id` in the response.

**Response (201 Created):**

```json
{
  "resourceType": "DocumentReference",
  "id": "4a0e5f18-1747-4438-ac52-5ba2c21575f5",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2025-11-27T16:50:48.338244Z"
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

**Note:** The `id` in the response matches the `X-Request-ID` header value.

### GET /patient-data-manager/FHIR/R4/DocumentReference/{id}

Retrieves a specific PDM DocumentReference by ID.

**Request:**

```bash
curl https://<api-gateway-url>/patient-data-manager/FHIR/R4/DocumentReference/test-id \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/fhir+json" \
  -H "X-Request-ID: 848b67ea-eeaa-3620-a388-e4e8594ff2e3"
```

**Headers:**

- `Authorization: Bearer <token>` - Authentication token is not validated and can be any string value.
- `Content-Type: application/fhir+json` - Required content type.
- `X-Request-ID: <uuid>` - Used for request tracking and correlation. This isn't part of the ID or response that gets returned.

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

### Missing X-Request-ID Header

Both GET and POST endpoints require the `X-Request-ID` header. If it's missing, a 400 error is returned:

**Response (400 Bad Request):**

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "required",
      "details": {
        "text": "Missing X-Request-ID header"
      }
    }
  ]
}
```

### Error Scenarios

The mock API supports triggering specific error responses for testing in both endpoints. Use these special resource IDs:

| Resource ID              | Status Code | Error Code          | Description                              |
| ------------------------ | ----------- | ------------------- | ---------------------------------------- |
| `error-400-invalid`      | 400         | INVALID_VALUE       | Invalid resource value                   |
| `error-401-unauthorized` | 401         | UNAUTHORISED        | Unauthorized access                      |
| `error-403-forbidden`    | 403         | FORBIDDEN           | Access forbidden                         |
| `error-404-notfound`     | 404         | RESOURCE_NOT_FOUND  | Resource not found                       |
| `error-409-conflict`     | 409         | CONFLICT            | Resource already exists                  |
| `error-429-ratelimit`    | 429         | TOO_MANY_REQUESTS   | Rate limit exceeded                      |
| `error-500-internal`     | 500         | INTERNAL_ERROR      | Internal server error                    |
| `error-503-unavailable`  | 503         | SERVICE_UNAVAILABLE | Service temporarily unavailable          |
| `empty-response`         | 200         | -                   | Empty success response                   |
| `unavailable-response`   | 200         | -                   | Success response with no attachment.data |

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

| Variable                | Description                              | Default                  |
| ----------------------- | ---------------------------------------- | ------------------------ |
| `LOG_LEVEL`             | Logging level (DEBUG, INFO, WARN, ERROR) | `INFO`                   |

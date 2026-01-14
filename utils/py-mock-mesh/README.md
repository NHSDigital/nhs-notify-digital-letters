# py-mock-mesh

## Overview

The py-mock-mesh library provides a mock implementation of the Digital Letters MESH API using AWS S3, allowing developers to simulate interactions with the MESH service for testing and development purposes.

This library does the following:

- Simulates the sending and receiving of messages via the MESH API.
- Stores messages in AWS S3 buckets for retrieval and processing.
- Provides endpoints to interact with the mock MESH service.
- Supports testing of MESH API integrations without needing access to the live service.
- Facilitates development by mimicking the behaviour of the actual MESH service.
- Ensures compatibility with existing MESH API clients.
- Allows configuration of message delivery delays and errors for testing purposes.
- Includes logging and monitoring features for debugging and analysis.

## Sending and Receiving Messages

1. **Upload a test message** (CSV file) to the S3 bucket with required metadata:

   ```bash
   mesh_message_id=$(uuidgen)
   aws s3 cp <input_file.csv> \
     s3://nhs-<account_id>-eu-west-2-<environment>-dl-non-pii-data/mock-mesh/<mailbox-id>/in/$mesh_message_id \
     --metadata "{\"subject\":\"<SUBJECT>\",\"sender\":\"<SENDER_MAILBOX_ID>\",\"workflow_id\":\"<WORKFLOW_ID>\",\"local_id\":\"<LOCAL_ID>\"}"
   ```

   **Note:** The input file must be a CSV (comma-delimited). Ensure the sender mailbox ID exists in SSM Parameter Store at `/dl/<environment>/senders/<SENDER_MAILBOX_ID>` with valid sender configuration.

2. **Trigger the MESH poll lambda** by pressing 'Test' in the AWS console, or wait for the scheduled poll (every 5 minutes).

3. **Check CloudWatch logs** for the MESH poll lambda first, then the MESH download lambda to verify message processing.

# py-mock-mesh

## Overview

The py-mock-mesh library provides a mock implementation of the NHS Notify MESH API using AWS S3, allowing developers to simulate interactions with the MESH service for testing and development purposes.

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

1. Upload the to the S3 bucket by running this command: `aws s3 cp --metadata <field>=<value>,<field2>=<value2> <input_file> <target_path>`. Note: the target path should be the `nhs-<account>-<region>-<environment>-dl-letters` bucket for your environment. For example: the target path would be `s3://nhs-123456789012-eu-west-2-pr42-dl-letters/mock-mesh/<target-mailbox>/in/<key>`. The key is what the file will be saved as in the AWS S3 bucket, this is a string.
2. The MESH poll lambda can be invoked early by pressing 'Test' in the AWS console. Alternatively, the lambda polls the mailbox every 5 minutes.
3. To check for any errors and troubleshoot or that the message has been sent successfully, check the logs in the lambdas in the following order: MESH poller lambda, then the MESH download lambda.

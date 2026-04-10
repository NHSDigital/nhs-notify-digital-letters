"""Module for storing document references in S3"""

from botocore.exceptions import ClientError


class IntermediaryBodyStoreError(Exception):
    """Error to represent any failure to upload document to intermediate location"""


class DocumentAlreadyExistsError(Exception):
    """Raised when a document already exists in S3"""


class DocumentStoreConfig:
    """Configuration holder for DocumentStore"""
    def __init__(self, s3_client, transactional_data_bucket):
        self.s3_client = s3_client
        self.transactional_data_bucket = transactional_data_bucket


class DocumentStore:  # pylint: disable=too-few-public-methods
    """Class for storing document references in S3"""

    def __init__(self, config):
        self.config = config

    def store_document(self, sender_id, message_reference, mesh_message_id, content):
        """store document reference in S3"""

        s3_key = f"document-reference/{sender_id}/{message_reference}_{mesh_message_id}"

        try:
            s3_response = self.config.s3_client.put_object(
                Bucket=self.config.transactional_data_bucket,
                Key=s3_key,
                Body=content,
                IfNoneMatch='*'
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'PreconditionFailed':
                raise DocumentAlreadyExistsError(
                    f"Document already exists for key: {s3_key}"
                ) from e
            raise IntermediaryBodyStoreError(e) from e

        if s3_response['ResponseMetadata']['HTTPStatusCode'] != 200:
            raise IntermediaryBodyStoreError(s3_response)

        return s3_key

"""Module for storing document references in S3"""


class IntermediaryBodyStoreError(Exception):
    """Error to represent any failure to upload document to intermediate location"""


class DocumentStoreConfig:
    """Configuration holder for DocumentStore"""
    def __init__(self, s3_client, transactional_data_bucket):
        self.s3_client = s3_client
        self.transactional_data_bucket = transactional_data_bucket


class DocumentStore:  # pylint: disable=too-few-public-methods
    """Class for storing document references in S3"""

    def __init__(self, config):
        self.config = config

    def store_document(self, sender_id, message_reference, content):
        """store document reference in S3"""

        s3_key = f"document-reference/{sender_id}_{message_reference}"

        s3_response = self.config.s3_client.put_object(
            Bucket=self.config.transactional_data_bucket,
            Key=s3_key,
            Body=content
        )

        if s3_response['ResponseMetadata']['HTTPStatusCode'] != 200:
            raise IntermediaryBodyStoreError(s3_response)

        return s3_key

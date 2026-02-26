""" Module for fetching reports from S3 """

from urllib.parse import urlparse
from .errors import ReportNotFoundError

class ReportsStore:
    """Class for fetching reports from S3"""

    def __init__(self, s3_client):
        self.__s3_client = s3_client

    def download_report(self, s3_uri):
        """Download report from S3 given its URI is in format s3://<bucket>/<key> """
        # Parse the S3 URI
        parsed_uri = urlparse(s3_uri)
        bucket = parsed_uri.netloc
        key = parsed_uri.path.lstrip('/')  # Remove leading slash from the path

        # Download the object
        s3_response = self.__s3_client.get_object(
            Bucket=bucket,
            Key=key
        )

        if s3_response['ResponseMetadata']['HTTPStatusCode'] != 200:
            raise ReportNotFoundError(f"Failed to fetch report from S3: {s3_response}")

        return s3_response['Body'].read()

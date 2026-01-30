"""Tests for ReportsStore"""
import pytest
from unittest.mock import Mock
from report_sender.reports_store import ReportsStore
from report_sender.errors import ReportNotFoundError

@pytest.fixture(name='mock_s3_client')
def create_mock_s3_client():
    """Create a mock S3 client for testing"""
    s3_client = Mock()
    return s3_client

@pytest.fixture(name='reports_store')
def create_reports_store(mock_s3_client):
    """Create ReportsStore instance with mocked S3 client for testing"""
    return ReportsStore(mock_s3_client)

class TestReportsStore:
    """Test suite for ReportsStore"""

    def test_download_report_success(self, reports_store, mock_s3_client):
        """Successfully downloads report content from S3"""

        mock_s3_client.get_object.return_value = {
            'Body': Mock(read=Mock(return_value=b'report content')),
            'ResponseMetadata': {'HTTPStatusCode': 200}
        }

        bucket_name = 'test-bucket'
        key_name = 'report-key'
        s3_uri = f's3://{bucket_name}/{key_name}'

        result = reports_store.download_report(s3_uri)

        assert result == b'report content'
        mock_s3_client.get_object.assert_called_once_with(
            Bucket=bucket_name,
            Key=key_name
        )

    def test_download_report_s3_failure_raises_error(self, reports_store, mock_s3_client):
        """Raises ReportsStoreError when S3 get_object fails"""
        mock_s3_client.get_object.side_effect = Exception("S3 error")

        with pytest.raises(Exception):
            reports_store.download_report(
                s3_uri='s3://test-bucket/report-key'
            )

    def test_download_report_non_200_status_code_raises_error(self, reports_store, mock_s3_client):
        """Raises Exception when S3 returns non-200 status code"""
        mock_s3_client.get_object.return_value = {
            'Body': Mock(read=Mock(return_value=b'report content')),
            'ResponseMetadata': {'HTTPStatusCode': 404}
        }

        with pytest.raises(ReportNotFoundError, match="Failed to fetch report from S3"):
            reports_store.download_report(
                s3_uri='s3://test-bucket/report-key'
            )

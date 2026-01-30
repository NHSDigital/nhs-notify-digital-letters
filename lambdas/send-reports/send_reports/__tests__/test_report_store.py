"""Tests for ReportStore"""
import pytest
from unittest.mock import Mock
from send_reports.report_store import ReportStore

class TestReportStore:
    """Test suite for ReportStore"""

    def test_download_report_success(self):
        """Successfully downloads report content from S3"""
        mock_s3_client = Mock()
        mock_s3_client.get_object.return_value = {
            'Body': Mock(read=Mock(return_value=b'report content')),
            'ResponseMetadata': {'HTTPStatusCode': 200}
        }

        store = ReportStore(mock_s3_client)

        bucket_name = 'test-bucket'
        key_name = 'report-key'
        s3_uri = f's3://{bucket_name}/{key_name}'

        result = store.download_report(s3_uri)

        assert result == b'report content'
        mock_s3_client.get_object.assert_called_once_with(
            Bucket=bucket_name,
            Key=key_name
        )

    def test_download_report_s3_failure_raises_error(self):
        """Raises ReportStoreError when S3 get_object fails"""
        mock_s3_client = Mock()
        mock_s3_client.get_object.side_effect = Exception("S3 error")

        store = ReportStore(mock_s3_client)

        with pytest.raises(Exception):
            store.download_report(
                s3_uri=f's3://test-bucket/report-key'
            )

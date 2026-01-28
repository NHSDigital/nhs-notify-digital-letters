"""Tests for DocumentStore"""
import pytest
from unittest.mock import Mock
from mesh_download.document_store import DocumentStore, IntermediaryBodyStoreError


class TestDocumentStore:
    """Test suite for DocumentStore"""

    def test_store_document_success(self):
        """Successfully stores document and returns S3 key"""
        mock_s3_client = Mock()
        mock_s3_client.put_object.return_value = {
            'ResponseMetadata': {'HTTPStatusCode': 200}
        }

        config = Mock()
        config.s3_client = mock_s3_client
        config.transactional_data_bucket = 'test-pii-bucket'

        store = DocumentStore(config)

        result = store.store_document(
            sender_id='SENDER_001',
            message_reference='ref_123',
            content=b'test content'
        )

        assert result == 'document-reference/SENDER_001_ref_123'
        mock_s3_client.put_object.assert_called_once_with(
            Bucket='test-pii-bucket',
            Key='document-reference/SENDER_001_ref_123',
            Body=b'test content'
        )

    def test_store_document_s3_failure_raises_error(self):
        """Raises IntermediaryBodyStoreError when S3 put_object fails"""
        mock_s3_client = Mock()
        mock_s3_client.put_object.return_value = {
            'ResponseMetadata': {'HTTPStatusCode': 500}
        }

        config = Mock()
        config.s3_client = mock_s3_client
        config.transactional_data_bucket = 'test-pii-bucket'

        store = DocumentStore(config)

        with pytest.raises(IntermediaryBodyStoreError):
            store.store_document(
                sender_id='SENDER_001',
                message_reference='ref_123',
                content=b'test content'
            )

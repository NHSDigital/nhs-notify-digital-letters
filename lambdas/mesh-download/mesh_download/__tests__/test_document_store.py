"""Tests for DocumentStore"""
import pytest
from unittest.mock import Mock
from botocore.exceptions import ClientError
from mesh_download.document_store import DocumentStore, IntermediaryBodyStoreError, DocumentAlreadyExistsError


def make_client_error(code):
    """Helper to build a botocore ClientError with a given error code"""
    return ClientError(
        {'Error': {'Code': code, 'Message': 'test'}},
        'PutObject'
    )


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
            sender_id='SENDER-001',
            message_reference='ref-123',
            mesh_message_id='mesh-456',
            content=b'test content'
        )

        assert result == 'document-reference/SENDER-001/ref-123_mesh-456'
        mock_s3_client.put_object.assert_called_once_with(
            Bucket='test-pii-bucket',
            Key='document-reference/SENDER-001/ref-123_mesh-456',
            Body=b'test content',
            IfNoneMatch='*'
        )

    def test_store_document_s3_failure_raises_error(self):
        """Raises IntermediaryBodyStoreError when S3 put_object fails with a non-HTTP error"""
        mock_s3_client = Mock()
        mock_s3_client.put_object.side_effect = make_client_error('InternalError')

        config = Mock()
        config.s3_client = mock_s3_client
        config.transactional_data_bucket = 'test-pii-bucket'

        store = DocumentStore(config)

        with pytest.raises(IntermediaryBodyStoreError):
            store.store_document(
                sender_id='SENDER-001',
                message_reference='ref-123',
                mesh_message_id='mesh-456',
                content=b'test content'
            )

    def test_store_document_raises_error_on_non_200_response(self):
        """Raises IntermediaryBodyStoreError when S3 returns a non-200 HTTP status"""
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
                sender_id='SENDER-001',
                message_reference='ref-123',
                mesh_message_id='mesh-456',
                content=b'test content'
            )

    def test_store_document_precondition_failed_raises_document_already_exists(self):
        """Raises DocumentAlreadyExistsError when S3 returns PreconditionFailed (object already exists)"""
        mock_s3_client = Mock()
        mock_s3_client.put_object.side_effect = make_client_error('PreconditionFailed')

        config = Mock()
        config.s3_client = mock_s3_client
        config.transactional_data_bucket = 'test-pii-bucket'

        store = DocumentStore(config)

        with pytest.raises(DocumentAlreadyExistsError, match='document-reference/SENDER-001/ref-123_mesh-456'):
            store.store_document(
                sender_id='SENDER-001',
                message_reference='ref-123',
                mesh_message_id='mesh-456',
                content=b'test content'
            )

"""
Tests for mesh-download MeshDownloadProcessor
Following the pattern from mesh-poll tests
"""
import json
from uuid import uuid4
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timezone
from pydantic import ValidationError


def setup_mocks():
    """
    Create all mock objects needed for processor testing
    """
    mesh_client = Mock()
    log = Mock()
    s3_client = Mock()
    event_publisher = Mock()
    document_store = Mock()

    return mesh_client, log, s3_client, event_publisher, document_store


def create_valid_cloud_event():
    """
    Create a valid CloudEvent for testing
    """
    return {
        'profileversion': '1.0.0',
        'profilepublished': '2025-10',
        'id': str(uuid4()),
        'specversion': '1.0',
        'source': '/nhs/england/notify/development/primary/data-plane/digitalletters/mesh',
        'subject': 'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000',
        'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1',
        'time': '2023-01-01T12:00:00Z',
        'recordedtime': '2023-01-01T12:00:00Z',
        'severitynumber': 2,
        'severitytext': 'INFO',
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letters-mesh-inbox-message-received-data.schema.json',
        'dataschemaversion': '1.0',
        'data': {
            'meshMessageId': 'test_message_123',
            'senderId': 'TEST_SENDER',
            'workflowId': 'TEST_WORKFLOW'
        }
    }


def create_sqs_record(cloud_event=None):
    """
    Create a mock SQS record containing a CloudEvent
    """
    if cloud_event is None:
        cloud_event = create_valid_cloud_event()

    return {
        'messageId': 'sqs-msg-123',
        'eventSource': 'aws:sqs',
        'body': json.dumps({'detail': cloud_event})
    }


def create_mesh_message(message_id='test_123', sender='SENDER_001', local_id='ref_001'):
    """
    Create a mock MESH message object
    """
    message = Mock()
    message.id.return_value = message_id
    message.sender = sender
    message.local_id = local_id
    message.subject = 'test_document.pdf'
    message.workflow_id = 'TEST_WORKFLOW'
    message.message_type = 'DATA'
    message.read.return_value = b'Test message content'
    message.acknowledge = Mock()
    return message


class TestMeshDownloadProcessor:
    """Test suite for MeshDownloadProcessor"""

    @patch('src.processor.os.getenv')
    def test_processor_initialization_with_event_publisher(self, mock_getenv):
        """Processor initializes and handshakes mesh client when EventPublisher configured"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        def getenv_side_effect(key, default=None):
            return {
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket',
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_client.handshake.assert_called_once()

    @patch('src.processor.datetime')
    @patch('src.processor.os.getenv')
    def test_process_sqs_message_success(self, mock_getenv, mock_datetime):
        """Successful end-to-end: validate, download, store via document_store, publish, acknowledge"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        # Fix now for deterministic behaviour if used; not absolutely required here
        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        def getenv_side_effect(key, default=None):
            return {
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1',
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        # document_store returns an S3 key when storing
        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'

        # event publisher successful
        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        # Setup MESH message
        mesh_message = create_mesh_message()
        mesh_client.retrieve_message.return_value = mesh_message

        # Prepare SQS record containing valid event
        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        # Verify MESH message was retrieved with meshMessageId from the cloud event
        mesh_client.retrieve_message.assert_called_once_with('test_message_123')

        # Verify message content was read
        mesh_message.read.assert_called_once()

        # Verify we delegated storage to document_store with correct arguments
        document_store.store_document.assert_called_once_with(
            sender_id='TEST_SENDER',
            message_reference='ref_001',
            content=b'Test message content'
        )

        # Verify message was acknowledged after successful store and publish
        mesh_message.acknowledge.assert_called_once()

        # Verify event was published once
        event_publisher.send_events.assert_called_once()

    @patch('src.processor.os.getenv')
    def test_process_sqs_message_validation_failure(self, mock_getenv):
        """Malformed CloudEvents should be rejected by pydantic and not trigger downloads"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        def getenv_side_effect(key, default=None):
            return {
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket',
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        # Create broken cloud event
        invalid_event = {'id': 'test-id'}  # missing required fields
        sqs_record = create_sqs_record(cloud_event=invalid_event)

        with pytest.raises(ValidationError):
            processor.process_sqs_message(sqs_record)

        # No retrieval attempted
        mesh_client.retrieve_message.assert_not_called()

    @patch('src.processor.os.getenv')
    def test_process_sqs_message_missing_mesh_message_id(self, mock_getenv):
        """Event missing meshMessageId should not be processed"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        def getenv_side_effect(key, default=None):
            return {
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket',
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        event = create_valid_cloud_event()
        del event['data']['meshMessageId']
        sqs_record = create_sqs_record(cloud_event=event)

        # Should raise ValidationError for missing required field
        with pytest.raises(ValidationError, match="meshMessageId"):
            processor.process_sqs_message(sqs_record)

        mesh_client.retrieve_message.assert_not_called()

    @patch('src.processor.os.getenv')
    def test_download_and_store_message_not_found(self, mock_getenv):
        """If MESH returns None, nothing is stored or published"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        def getenv_side_effect(key, default=None):
            return {
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1',
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_client.retrieve_message.return_value = None
        sqs_record = create_sqs_record()
        processor.process_sqs_message(sqs_record)

        document_store.store_document.assert_not_called()
        event_publisher.send_events.assert_not_called()

    @patch('src.processor.os.getenv')
    def test_document_store_failure_prevents_ack_and_raises(self, mock_getenv):
        """If storing fails the processor should raise and not acknowledge the MESH message"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        def getenv_side_effect(key, default=None):
            return {
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1',
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket'
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        document_store.store_document.side_effect = Exception("document store failure")

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        with pytest.raises(Exception, match="document store failure"):
            processor.process_sqs_message(sqs_record)

        # ensure we did not acknowledge the message if storage failed
        mesh_message.acknowledge.assert_not_called()

    @patch('src.processor.datetime')
    @patch('src.processor.os.getenv')
    def test_bucket_selection_with_mesh_mock_enabled(self, mock_getenv, mock_datetime):
        """When USE_MESH_MOCK=true, processor uses MOCK_MESH_BUCKET for storage"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        def getenv_side_effect(key, default=''):
            return {
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1',
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket',
                'USE_MESH_MOCK': 'true'  # Mock enabled
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'
        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        # Verify event was published with MOCK_MESH_BUCKET in URI
        event_publisher.send_events.assert_called_once()
        published_events = event_publisher.send_events.call_args[0][0]
        assert len(published_events) == 1
        message_uri = published_events[0]['data']['messageUri']
        assert message_uri.startswith('s3://test-mock-bucket/')

    @patch('src.processor.datetime')
    @patch('src.processor.os.getenv')
    def test_bucket_selection_with_mesh_mock_disabled(self, mock_getenv, mock_datetime):
        """When USE_MESH_MOCK=false, processor uses PII_BUCKET for storage"""
        from src.processor import MeshDownloadProcessor

        mesh_client, log, s3_client, event_publisher, document_store = setup_mocks()

        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        def getenv_side_effect(key, default=''):
            return {
                'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:test',
                'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.test.com/dlq',
                'ENVIRONMENT': 'development',
                'DEPLOYMENT': 'dev-1',
                'PII_BUCKET': 'test-pii-bucket',
                'MOCK_MESH_BUCKET': 'test-mock-bucket',
                'USE_MESH_MOCK': 'false'  # Mock disabled
            }.get(key, default)

        mock_getenv.side_effect = getenv_side_effect

        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'
        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            mesh_client=mesh_client,
            log=log,
            s3_client=s3_client,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        event_publisher.send_events.assert_called_once()
        published_events = event_publisher.send_events.call_args[0][0]
        assert len(published_events) == 1
        message_uri = published_events[0]['data']['messageUri']
        assert message_uri.startswith('s3://test-pii-bucket/')

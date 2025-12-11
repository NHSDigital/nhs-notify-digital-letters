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
    config = Mock()
    # Set up default config attributes
    config.mesh_client = Mock()
    config.download_metric = Mock()
    config.s3_client = Mock()
    config.environment = 'development'
    config.transactional_data_bucket = 'test-pii-bucket'
    config.use_mesh_mock = False

    log = Mock()
    event_publisher = Mock()
    document_store = Mock()

    return config, log, event_publisher, document_store


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
            'messageReference': 'ref_001'
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

    def test_processor_initialization_calls_mesh_handshake(self):
        """Processor initializes and handshakes mesh client"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        config.mesh_client.handshake.assert_called_once()

    @patch('src.processor.datetime')
    def test_process_sqs_message_success(self, mock_datetime):
        """Successful end-to-end: validate, download, store via document_store, publish, acknowledge"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()

        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'

        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        config.mesh_client.retrieve_message.return_value = mesh_message

        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        config.mesh_client.retrieve_message.assert_called_once_with('test_message_123')

        mesh_message.read.assert_called_once()

        document_store.store_document.assert_called_once_with(
            sender_id='TEST_SENDER',
            message_reference='ref_001',
            content=b'Test message content'
        )

        mesh_message.acknowledge.assert_called_once()

        config.download_metric.record.assert_called_once_with(1)

        event_publisher.send_events.assert_called_once()

        # Verify the published event content
        published_events = event_publisher.send_events.call_args[0][0]
        assert len(published_events) == 1

        published_event = published_events[0]

        # Verify CloudEvent envelope fields
        assert published_event['type'] == 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1'
        assert published_event['source'] == '/nhs/england/notify/development/primary/data-plane/digitalletters/mesh'
        assert published_event['subject'] == 'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000'
        assert published_event['time'] == '2025-11-19T15:30:45+00:00'
        assert 'id' in published_event

        # Verify CloudEvent data payload
        event_data = published_event['data']
        assert event_data['senderId'] == 'TEST_SENDER'
        assert event_data['messageReference'] == 'ref_001'
        assert event_data['messageUri'] == 's3://test-pii-bucket/document-reference/SENDER_001_ref_001'
        assert set(event_data.keys()) == {'senderId', 'messageReference', 'messageUri'}

    def test_process_sqs_message_validation_failure(self):
        """Malformed CloudEvents should be rejected by pydantic and not trigger downloads"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        # Create broken cloud event
        invalid_event = {'id': 'test-id'}  # missing required fields
        sqs_record = create_sqs_record(cloud_event=invalid_event)

        with pytest.raises(ValidationError):
            processor.process_sqs_message(sqs_record)

        config.mesh_client.retrieve_message.assert_not_called()

    def test_process_sqs_message_missing_mesh_message_id(self):
        """Event missing meshMessageId should not be processed"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        event = create_valid_cloud_event()
        del event['data']['meshMessageId']
        sqs_record = create_sqs_record(cloud_event=event)

        # Should raise ValidationError for missing required field
        with pytest.raises(ValidationError, match="meshMessageId"):
            processor.process_sqs_message(sqs_record)

        config.mesh_client.retrieve_message.assert_not_called()

    def test_download_and_store_message_not_found(self):
        """If MESH returns None, nothing is stored or published"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()
        bound_logger = Mock()
        log.bind.return_value = bound_logger

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        config.mesh_client.retrieve_message.return_value = None
        sqs_record = create_sqs_record()
        processor.process_sqs_message(sqs_record)
        config.mesh_client.retrieve_message.assert_called_once_with('test_message_123')

        document_store.store_document.assert_not_called()
        event_publisher.send_events.assert_not_called()
        config.download_metric.record.assert_not_called()

        bound_logger.error.assert_called_once_with("Message not found in MESH inbox")

    def test_document_store_failure_prevents_ack_and_raises(self):
        """If storing fails the processor should raise and not acknowledge the MESH message"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()

        document_store.store_document.side_effect = Exception("document store failure")

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        config.mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        with pytest.raises(Exception, match="document store failure"):
            processor.process_sqs_message(sqs_record)

        # ensure we did not acknowledge the message if storage failed
        mesh_message.acknowledge.assert_not_called()

    @patch('src.processor.datetime')
    def test_bucket_selection_with_mesh_mock_enabled(self, mock_datetime):
        """When use_mesh_mock=True, processor uses PII bucket for storage"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()
        # Configure for mock mesh
        config.use_mesh_mock = True
        config.transactional_data_bucket = 'test-pii-bucket'

        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'
        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        config.mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        # Verify event was published with PII bucket in URI
        event_publisher.send_events.assert_called_once()
        published_events = event_publisher.send_events.call_args[0][0]
        assert len(published_events) == 1
        message_uri = published_events[0]['data']['messageUri']
        assert message_uri.startswith('s3://test-pii-bucket/')

    @patch('src.processor.datetime')
    def test_bucket_selection_with_mesh_mock_disabled(self, mock_datetime):
        """When use_mesh_mock=False, processor uses PII bucket for storage"""
        from src.processor import MeshDownloadProcessor

        config, log, event_publisher, document_store = setup_mocks()
        # Configure for production (PII bucket)
        config.use_mesh_mock = False
        config.transactional_data_bucket = 'test-pii-bucket'

        fixed_time = datetime(2025, 11, 19, 15, 30, 45, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        document_store.store_document.return_value = 'document-reference/SENDER_001_ref_001'
        event_publisher.send_events.return_value = []

        processor = MeshDownloadProcessor(
            config=config,
            log=log,
            mesh_client=config.mesh_client,
            download_metric=config.download_metric,
            document_store=document_store,
            event_publisher=event_publisher
        )

        mesh_message = create_mesh_message()
        config.mesh_client.retrieve_message.return_value = mesh_message
        sqs_record = create_sqs_record()

        processor.process_sqs_message(sqs_record)

        event_publisher.send_events.assert_called_once()
        published_events = event_publisher.send_events.call_args[0][0]
        assert len(published_events) == 1
        message_uri = published_events[0]['data']['messageUri']
        assert message_uri.startswith('s3://test-pii-bucket/')

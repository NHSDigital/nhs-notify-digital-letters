"""
Tests for event parsing and publishing in mesh_acknowledge.events
"""
import json
from datetime import datetime, timezone
from typing import Dict
from uuid import uuid4

from unittest.mock import Mock, patch
import pytest
from digital_letters_events import MESHInboxMessageAcknowledged, MESHInboxMessageDownloaded
from mesh_acknowledge.events import (
    parse_downloaded_event,
    publish_acknowledged_event
)

from .fixtures import create_downloaded_event_dict


@pytest.fixture(name='mock_logger')
def create_mock_logger():
    """Create a mock logger for testing"""
    logger = Mock()
    logger.info = Mock()
    logger.error = Mock()
    return logger


@pytest.fixture(name='mock_event_publisher')
def create_mock_event_publisher():
    """Create a mock EventPublisher for testing"""
    publisher = Mock()
    publisher.send_events = Mock(return_value=[])
    return publisher


@pytest.fixture(name='event_id')
def generate_event_id() -> str:
    """Generate a unique event ID"""
    return str(uuid4())


@pytest.fixture(name='downloaded_event')
def downloaded_event_fixture(event_id: str) -> MESHInboxMessageDownloaded:
    """Create a MESHInboxMessageDownloaded event"""
    return MESHInboxMessageDownloaded(**create_downloaded_event_dict(event_id))


@pytest.fixture(name='valid_sqs_record')
def create_valid_sqs_record(event_id: str) -> Dict[str, str | int]:
    """Create a valid SQS record with MESHInboxMessageDownloaded event"""
    return {
        'body': json.dumps({
            'detail': {
                **create_downloaded_event_dict(event_id),
            }
        })
    }


@pytest.fixture(name='invalid_sqs_record')
def create_invalid_sqs_record(event_id: str) -> Dict[str, str]:
    """Create a valid SQS record with an invalid MESHInboxMessageDownloaded event"""
    return {
        'body': json.dumps({
            'detail': {
                'id': event_id,
                'specversion': '1.0',
                'source': '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
                'subject': (
                    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/'
                    '769acdd4-6a47-496f-999f-76a6fd2c3959'
                ),
                'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
                'time': '2026-01-08T10:00:00Z',
                'recordedtime': '2026-01-08T10:00:00Z',
                'severitynumber': 2,
                'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
                'datacontenttype': 'application/json',
                'dataschema': (
                    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/'
                    'digital-letters-mesh-inbox-message-downloaded-data.schema.json'
                ),
                'data': {
                    'meshMessageId': 'MSG123456',
                    'messageUri': f"https://example.com/ttl/resource/{event_id}",
                    'messageReference': 'REF123',
                    'senderId': 'SENDER001',
                    'extraField': 'INVALID'  # Invalid extra field
                }
            }
        })
    }


class TestParseDownloadedEvent:
    """Test suite for parse_downloaded_event function"""

    def test_parse_valid_event(
            self, valid_sqs_record: Dict[str, str | int],
            downloaded_event: MESHInboxMessageDownloaded,
            mock_logger):
        """Test parsing a valid SQS record"""
        result = parse_downloaded_event(valid_sqs_record, mock_logger, )

        assert result == downloaded_event

    def test_parse_event_with_missing_detail(self, mock_logger):
        """Test parsing SQS record with missing 'detail' field"""
        sqs_record = {'body': json.dumps({})}

        with pytest.raises(ValueError):
            parse_downloaded_event(sqs_record, mock_logger)

    def test_parse_event_validation_error(
            self, invalid_sqs_record: Dict[str, str | int],
            mock_logger):
        """Test handling validation errors from Pydantic model"""
        with pytest.raises(ValueError, match="Error processing MESHInboxMessageDownloaded event"):
            parse_downloaded_event(invalid_sqs_record, mock_logger)

    def test_parse_event_json_decode_error(self, mock_logger):
        """Test handling JSON decode errors"""
        sqs_record = {'body': 'invalid json'}

        with pytest.raises(ValueError, match="Error parsing SQS record"):
            parse_downloaded_event(sqs_record, mock_logger)


class TestPublishAcknowledgedEvent:
    """Test suite for publish_acknowledged_event function"""

    @patch('mesh_acknowledge.events.uuid4')
    @patch('mesh_acknowledge.events.datetime')
    def test_publish_success(
        self,
        mock_datetime,
        mock_uuid,
        mock_logger,
        mock_event_publisher,
        downloaded_event: MESHInboxMessageDownloaded
    ):
        """Test successful event publishing"""
        new_event_id = str(uuid4())
        mock_uuid.return_value = new_event_id
        fixed_time = datetime(2026, 1, 8, 10, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        mock_event_publisher.send_events.return_value = []

        mesh_mailbox_id = 'MAILBOX001'
        expected_ack_event = {
            **downloaded_event.model_dump(exclude_none=True),
            'id': new_event_id,
            'time': fixed_time.isoformat(),
            'recordedtime': fixed_time.isoformat(),
            'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.acknowledged.v1',
            'dataschema': (
                'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/'
                'digital-letters-mesh-inbox-message-acknowledged-data.schema.json'
            ),
            'data': {
                'messageReference': downloaded_event.data.messageReference,
                'senderId': downloaded_event.data.senderId,
                'meshMailboxId': mesh_mailbox_id,
            }
        }

        publish_acknowledged_event(
            mock_logger,
            mock_event_publisher,
            downloaded_event,
            mesh_mailbox_id
        )

        # Verify event was sent
        mock_event_publisher.send_events.assert_called_once_with(
            [expected_ack_event], MESHInboxMessageAcknowledged)

    @patch('mesh_acknowledge.events.uuid4')
    @patch('mesh_acknowledge.events.datetime')
    def test_publish_failure_raises_error(
        self,
        mock_datetime,
        mock_uuid,
        mock_logger,
        mock_event_publisher,
        downloaded_event
    ):
        """Test that publishing failures raise RuntimeError"""
        mock_uuid.return_value = str(uuid4())
        fixed_time = datetime(2026, 1, 8, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        failed_events = [{'error': 'send failed'}]
        mock_event_publisher.send_events.return_value = failed_events

        with pytest.raises(
                RuntimeError, match="Failed to publish MESHInboxMessageAcknowledged event"):
            publish_acknowledged_event(
                mock_logger,
                mock_event_publisher,
                downloaded_event,
                'MAILBOX001'
            )

    @patch('mesh_acknowledge.events.uuid4')
    @patch('mesh_acknowledge.events.datetime')
    def test_publish_error_event_raises_error(
        self,
        mock_datetime,
        mock_uuid,
        mock_logger,
        mock_event_publisher,
        downloaded_event
    ):
        """Test that if the event publisher raises an error, an error is raised"""
        mock_uuid.return_value = str(uuid4())
        fixed_time = datetime(2026, 1, 8, 13, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        mock_event_publisher.send_events.side_effect = Exception("Publisher error")

        with pytest.raises(Exception, match="Publisher error"):
            publish_acknowledged_event(
                mock_logger,
                mock_event_publisher,
                downloaded_event,
                'MAILBOX001'
            )

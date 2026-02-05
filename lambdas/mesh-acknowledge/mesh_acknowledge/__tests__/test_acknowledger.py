"""
Tests for MeshAcknowledger class
"""
import json
from unittest.mock import Mock
import pytest
from mesh_acknowledge.acknowledger import (
    MeshAcknowledger,
    NOTIFY_ACK_WORKFLOW_ID,
    ACK_SUBJECT
)

SENT_MESH_MESSAGE_ID = "MSG123456"


@pytest.fixture(name='mock_mesh_client')
def create_mock_mesh_client():
    """Create a mock MeshClient for testing"""
    client = Mock()
    client.handshake = Mock()
    client.send_message = Mock(return_value=SENT_MESH_MESSAGE_ID)
    return client


@pytest.fixture(name='mock_logger')
def create_mock_logger():
    """Create a mock logger for testing"""
    logger = Mock()
    logger.debug = Mock()
    return logger


@pytest.fixture(name='acknowledger')
def create_acknowledger(mock_mesh_client, mock_logger):
    """Create a MeshAcknowledger instance with mocked dependencies"""
    return MeshAcknowledger(mock_mesh_client, mock_logger)


class TestMeshAcknowledger:
    """Test suite for MeshAcknowledger class"""

    def test_init_performs_handshake(self, mock_mesh_client, mock_logger):
        """Test that __init__ performs a MESH handshake"""
        MeshAcknowledger(mock_mesh_client, mock_logger)

        mock_mesh_client.handshake.assert_called_once()

    def test_acknowledge_message_sends_correct_message(
        self, acknowledger, mock_mesh_client
    ):
        """Test that acknowledge_message sends the correct message via MESH"""
        mailbox_id = "MAILBOX001"
        message_id = "MSG123456"
        message_reference = "REF789"
        sender_id = "SENDER001"

        expected_body = json.dumps({
            "meshMessageId": message_id,
            "requestId": f"{sender_id}_{message_reference}"
        }).encode()

        acknowledger.acknowledge_message(
            mailbox_id, message_id, message_reference, sender_id
        )

        mock_mesh_client.send_message.assert_called_once_with(
            mailbox_id,
            expected_body,
            workflow_id=NOTIFY_ACK_WORKFLOW_ID,
            local_id=message_reference,
            subject=ACK_SUBJECT
        )

    def test_acknowledge_message_returns_ack_id(
        self, acknowledger, mock_mesh_client
    ):
        """Test that acknowledge_message returns the acknowledgment ID"""
        mailbox_id = "MAILBOX001"
        message_id = "MSG123456"
        message_reference = "REF789"
        sender_id = "SENDER001"

        expected_ack_id = "ACK_CUSTOM_ID"

        mock_mesh_client.send_message.return_value = expected_ack_id

        ack_message_id = acknowledger.acknowledge_message(
            mailbox_id, message_id, message_reference, sender_id
        )

        assert ack_message_id == expected_ack_id

    def test_acknowledge_message_raises_error_if_mesh_send_fails(
        self, acknowledger, mock_mesh_client
    ):
        """Test that the MeshAcknowledger raises an error if MESH send_message fails"""
        mailbox_id = "MAILBOX001"
        message_id = "MSG123"
        message_reference = "REF123"
        sender_id = "SENDER001"
        expected_exception_message = "MESH send failed"

        mock_mesh_client.send_message.side_effect = Exception(
            expected_exception_message)

        with pytest.raises(Exception, match=expected_exception_message):
            acknowledger.acknowledge_message(
                mailbox_id, message_id, message_reference, sender_id
            )

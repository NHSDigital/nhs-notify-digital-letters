"""
Tests for MeshReportsSender class
"""
import pytest
from unittest.mock import Mock
from report_sender.mesh_report_sender import MeshReportsSender

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

@pytest.fixture(name='mesh_report_sender')
def create_mesh_report_sender(mock_mesh_client, mock_logger):
    """Create a MeshReportsSender instance with mocked dependencies"""
    return MeshReportsSender(mock_mesh_client, mock_logger)

class TestMeshReportsSender:
    """Test suite for MeshReportsSender class"""

    def test_init_performs_handshake(self, mock_mesh_client, mock_logger):
        """Test that __init__ performs a MESH handshake"""
        MeshReportsSender(mock_mesh_client, mock_logger)

        mock_mesh_client.handshake.assert_called_once()

    def test_send_report_sends_correct_message(
        self, mesh_report_sender, mock_mesh_client
    ):
        """Test that send_report sends the correct message via MESH"""
        reporting_mailbox = "MAILBOX001"
        report_bytes = b"report content"
        report_date = "2026-02-03"
        report_reference = "report-reference-123"

        mesh_report_sender.send_report(reporting_mailbox, report_bytes, report_date, report_reference)

        mock_mesh_client.send_message.assert_called_once_with(
            reporting_mailbox,
            report_bytes,
            workflow_id='NHS_NOTIFY_DIGITAL_LETTERS_DAILY_REPORT',
            subject=report_date,
            local_id=report_reference
        )

    def test_send_report_raises_error_if_mesh_send_fails(
            self, mesh_report_sender, mock_mesh_client
    ):
        """Test that send_report raises an error if MESH send_message fails"""
        reporting_mailbox = "MAILBOX001"
        report_bytes = b"report content"
        report_date = "2026-02-03"
        report_reference = "report-reference-123"

        mock_mesh_client.send_message.side_effect = Exception("MESH send failed")

        with pytest.raises(Exception, match="MESH send failed"):
            mesh_report_sender.send_report(reporting_mailbox, report_bytes, report_date, report_reference)

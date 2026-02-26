import json
import pytest
from unittest.mock import Mock
from report_sender.sender_lookup import SenderLookup
from report_sender.errors import InvalidSenderDetailsError

test_sender_id = "test-sender-1"

@pytest.fixture(name='mock_ssm')
def create_mock_ssm():
    """Create a mock SSM client for testing"""
    ssm = Mock()
    ssm.get_parameter = Mock()

    return ssm

@pytest.fixture(name='mock_config')
def create_mock_config():
    """Create a mock config object for testing"""
    config = Mock()
    config.ssm_senders_prefix = "/test/senders"
    return config

class TestSenderLookup:
    """Test suite for SenderLookup class"""

    def test_get_mesh_mailbox_reports_id_from_sender_success(self, mock_ssm, mock_config):
        """Successfully retrieves mailbox ID from SSM parameter"""
        mailbox_id = "MAILBOX001"
        sender_parameter = {
            'Parameter': {
                'Name': f"{mock_config.ssm_senders_prefix}/{test_sender_id}",
                'Value': f'{{"meshMailboxReportsId": "{mailbox_id}"}}'
            }
        }
        mock_ssm.get_parameter.return_value = sender_parameter

        lookup = SenderLookup(mock_ssm, mock_config)
        result = lookup.get_mesh_mailbox_reports_id_from_sender(test_sender_id)

        assert result == mailbox_id
        mock_ssm.get_parameter.assert_called_once_with(
            Name=f"{mock_config.ssm_senders_prefix}/{test_sender_id}",
            WithDecryption=True
        )

    def test_get_mesh_mailbox_reports_id_from_sender_not_found(self, mock_ssm, mock_config):
        """Raises exception when sender ID is not found in SSM"""
        sender_id = "unknown_sender"
        mock_ssm.get_parameter.return_value = None

        lookup = SenderLookup(mock_ssm, mock_config)

        with pytest.raises(Exception) as exc_info:
            lookup.get_mesh_mailbox_reports_id_from_sender(sender_id)

        assert str(exc_info.value) == f"No sender found in SSM for sender ID {sender_id}"
        mock_ssm.get_parameter.assert_called_once_with(
            Name=f"{mock_config.ssm_senders_prefix}/{sender_id}",
            WithDecryption=True
        )

    def test_get_mesh_mailbox_reports_id_from_sender_missing_value_field(self, mock_ssm, mock_config):
        """Raises exception when Value field is missing from SSM parameter"""
        sender_parameter = {
            'Parameter': {
                'Name': f"{mock_config.ssm_senders_prefix}/{test_sender_id}"
                # Missing 'Value' field
            }
        }
        mock_ssm.get_parameter.return_value = sender_parameter

        lookup = SenderLookup(mock_ssm, mock_config)

        with pytest.raises(Exception) as exc_info:
            lookup.get_mesh_mailbox_reports_id_from_sender(test_sender_id)

        assert "missing a 'Value' field" in str(exc_info.value)

    def test_get_mesh_mailbox_reports_id_from_sender_invalid_json(self, mock_ssm, mock_config):
        """Raises exception when parameter value is not valid JSON"""
        sender_parameter = {
            'Parameter': {
                'Name': f"{mock_config.ssm_senders_prefix}/{test_sender_id}",
                'Value': 'invalid json {'
            }
        }
        mock_ssm.get_parameter.return_value = sender_parameter

        lookup = SenderLookup(mock_ssm, mock_config)

        with pytest.raises(InvalidSenderDetailsError) as exc_info:
            lookup.get_mesh_mailbox_reports_id_from_sender(test_sender_id)

        assert "Failed to parse meshMailboxReportsId from parameter for sender ID test-sender-1" in str(exc_info.value)

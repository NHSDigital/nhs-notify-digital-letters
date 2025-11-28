"""
Tests for SenderLookup
"""
import json
import pytest
from unittest.mock import Mock, call
from src.sender_lookup import SenderLookup


def setup_mocks():
    ssm = Mock()

    config = Mock()
    config.ssm_senders_parameter_path = "/dl/test/mesh/senders"

    logger = Mock()

    return ssm, config, logger


def create_sender_parameter(sender_id, mailbox_id):
    return {
        "Name": f"/dl/test/mesh/senders/{sender_id}",
        "Value": json.dumps({
            "senderId": sender_id,
            "meshMailboxSenderId": mailbox_id,
            "name": f"Test Sender {sender_id}"
        })
    }


class TestSenderLookup:
    """Test suite for SenderLookup"""

    def test_load_valid_senders_single_page(self):
        """Test loading valid senders from SSM (single page)"""

        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
                create_sender_parameter("sender2", "MAILBOX_002"),
                create_sender_parameter("sender3", "MAILBOX_003"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        ssm.get_parameters_by_path.assert_called_once_with(
            Path="/dl/test/mesh/senders/",
            WithDecryption=True
        )
        assert sender_lookup.is_valid_sender("MAILBOX_001")
        assert sender_lookup.is_valid_sender("MAILBOX_002")
        assert sender_lookup.is_valid_sender("MAILBOX_003")
        assert not sender_lookup.is_valid_sender("UNKNOWN_MAILBOX")

    def test_load_valid_senders_multiple_pages(self):
        """Test loading valid senders from SSM with pagination"""

        ssm, config, logger = setup_mocks()

        # Simulate paginated response
        ssm.get_parameters_by_path.side_effect = [
            {
                "Parameters": [
                    create_sender_parameter("sender1", "MAILBOX_001"),
                    create_sender_parameter("sender2", "MAILBOX_002"),
                ],
                "NextToken": "token123"
            },
            {
                "Parameters": [
                    create_sender_parameter("sender3", "MAILBOX_003"),
                ],
            }
        ]

        sender_lookup = SenderLookup(ssm, config, logger)

        assert ssm.get_parameters_by_path.call_count == 2
        ssm.get_parameters_by_path.assert_has_calls([
            call(Path="/dl/test/mesh/senders/", WithDecryption=True),
            call(Path="/dl/test/mesh/senders/", WithDecryption=True, NextToken="token123")
        ], any_order=False)
        assert sender_lookup.is_valid_sender("MAILBOX_001")
        assert sender_lookup.is_valid_sender("MAILBOX_002")
        assert sender_lookup.is_valid_sender("MAILBOX_003")

    def test_is_valid_sender_case_insensitive(self):
        """Test that sender validation is case-insensitive"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "Mailbox_MixedCase"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert sender_lookup.is_valid_sender("Mailbox_MixedCase")
        assert sender_lookup.is_valid_sender("MAILBOX_MIXEDCASE")
        assert sender_lookup.is_valid_sender("mailbox_mixedcase")
        assert sender_lookup.is_valid_sender("mAiLbOx_MiXeDcAsE")

    def test_is_valid_sender_returns_false_for_empty_mailbox_id(self):
        """Test that empty mailbox IDs are rejected"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert not sender_lookup.is_valid_sender("")
        assert not sender_lookup.is_valid_sender(None)

    def test_load_valid_senders_handles_malformed_json(self):
        """Test that malformed JSON in parameters is handled gracefully"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/senders/bad_sender",
                    "Value": "not valid json {{"
                },
                create_sender_parameter("sender3", "MAILBOX_003"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert sender_lookup.is_valid_sender("MAILBOX_001")
        assert sender_lookup.is_valid_sender("MAILBOX_003")
        assert logger.warn.called

    def test_load_valid_senders_handles_missing_mailbox_id(self):
        """Test that parameters without meshMailboxSenderId are skipped"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/senders/incomplete_sender",
                    "Value": json.dumps({
                        "senderId": "incomplete",
                        "name": "Incomplete Sender"
                        # Missing meshMailboxSenderId
                    })
                },
                create_sender_parameter("sender3", "MAILBOX_003"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert sender_lookup.is_valid_sender("MAILBOX_001")
        assert sender_lookup.is_valid_sender("MAILBOX_003")

    def test_load_valid_senders_handles_empty_mailbox_id(self):
        """Test that empty meshMailboxSenderId values are skipped"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/senders/empty_mailbox",
                    "Value": json.dumps({
                        "senderId": "empty",
                        "meshMailboxSenderId": "",  # Empty string
                        "name": "Empty Mailbox Sender"
                    })
                },
                create_sender_parameter("sender3", "MAILBOX_003"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert sender_lookup.is_valid_sender("MAILBOX_001")
        assert sender_lookup.is_valid_sender("MAILBOX_003")
        assert not sender_lookup.is_valid_sender("")

    def test_load_valid_senders_with_trailing_slash_in_path(self):
        """Test that paths with trailing slashes are handled correctly"""
        ssm, config, logger = setup_mocks()
        config.ssm_senders_parameter_path = "/dl/test/mesh/senders/"  # Trailing slash

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_sender_parameter("sender1", "MAILBOX_001"),
            ]
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        ssm.get_parameters_by_path.assert_called_once_with(
            Path="/dl/test/mesh/senders/",
            WithDecryption=True
        )
        assert sender_lookup.is_valid_sender("MAILBOX_001")

    def test_load_valid_senders_handles_empty_response(self):
        """Test that empty SSM response is handled correctly"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": []
        }

        sender_lookup = SenderLookup(ssm, config, logger)

        assert not sender_lookup.is_valid_sender("ANY_MAILBOX")
        logger.debug.assert_called_once()
        call_args = logger.debug.call_args[0][0]
        assert "0" in call_args  # Should log count of 0

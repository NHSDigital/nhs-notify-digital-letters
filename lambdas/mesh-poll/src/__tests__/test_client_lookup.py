"""
Tests for ClientLookup
"""
import json
import pytest
from unittest.mock import Mock, call
from src.client_lookup import ClientLookup


def setup_mocks():
    ssm = Mock()

    config = Mock()
    config.ssm_clients_parameter_path = "/dl/test/mesh/clients"

    logger = Mock()

    return ssm, config, logger


def create_client_parameter(client_id, mailbox_id):
    return {
        "Name": f"/dl/test/mesh/clients/{client_id}",
        "Value": json.dumps({
            "clientId": client_id,
            "meshMailboxSenderId": mailbox_id,
            "name": f"Test Client {client_id}"
        })
    }


class TestClientLookup:
    """Test suite for ClientLookup"""

    def test_load_valid_senders_single_page(self):
        """Test loading valid senders from SSM (single page)"""

        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
                create_client_parameter("client2", "MAILBOX_002"),
                create_client_parameter("client3", "MAILBOX_003"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        ssm.get_parameters_by_path.assert_called_once_with(
            Path="/dl/test/mesh/clients/",
            WithDecryption=True
        )
        assert client_lookup.is_valid_sender("MAILBOX_001")
        assert client_lookup.is_valid_sender("MAILBOX_002")
        assert client_lookup.is_valid_sender("MAILBOX_003")
        assert not client_lookup.is_valid_sender("UNKNOWN_MAILBOX")

    def test_load_valid_senders_multiple_pages(self):
        """Test loading valid senders from SSM with pagination"""

        ssm, config, logger = setup_mocks()

        # Simulate paginated response
        ssm.get_parameters_by_path.side_effect = [
            {
                "Parameters": [
                    create_client_parameter("client1", "MAILBOX_001"),
                    create_client_parameter("client2", "MAILBOX_002"),
                ],
                "NextToken": "token123"
            },
            {
                "Parameters": [
                    create_client_parameter("client3", "MAILBOX_003"),
                ],
            }
        ]

        client_lookup = ClientLookup(ssm, config, logger)

        assert ssm.get_parameters_by_path.call_count == 2
        ssm.get_parameters_by_path.assert_has_calls([
            call(Path="/dl/test/mesh/clients/", WithDecryption=True),
            call(Path="/dl/test/mesh/clients/", WithDecryption=True, NextToken="token123")
        ], any_order=False)
        assert client_lookup.is_valid_sender("MAILBOX_001")
        assert client_lookup.is_valid_sender("MAILBOX_002")
        assert client_lookup.is_valid_sender("MAILBOX_003")

    def test_is_valid_sender_case_insensitive(self):
        """Test that sender validation is case-insensitive"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "Mailbox_MixedCase"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert client_lookup.is_valid_sender("Mailbox_MixedCase")
        assert client_lookup.is_valid_sender("MAILBOX_MIXEDCASE")
        assert client_lookup.is_valid_sender("mailbox_mixedcase")
        assert client_lookup.is_valid_sender("mAiLbOx_MiXeDcAsE")

    def test_is_valid_sender_returns_false_for_empty_mailbox_id(self):
        """Test that empty mailbox IDs are rejected"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert not client_lookup.is_valid_sender("")
        assert not client_lookup.is_valid_sender(None)

    def test_load_valid_senders_handles_malformed_json(self):
        """Test that malformed JSON in parameters is handled gracefully"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/clients/bad_client",
                    "Value": "not valid json {{"
                },
                create_client_parameter("client3", "MAILBOX_003"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert client_lookup.is_valid_sender("MAILBOX_001")
        assert client_lookup.is_valid_sender("MAILBOX_003")
        assert logger.warn.called

    def test_load_valid_senders_handles_missing_mailbox_id(self):
        """Test that parameters without meshMailboxSenderId are skipped"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/clients/incomplete_client",
                    "Value": json.dumps({
                        "clientId": "incomplete",
                        "name": "Incomplete Client"
                        # Missing meshMailboxSenderId
                    })
                },
                create_client_parameter("client3", "MAILBOX_003"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert client_lookup.is_valid_sender("MAILBOX_001")
        assert client_lookup.is_valid_sender("MAILBOX_003")

    def test_load_valid_senders_handles_empty_mailbox_id(self):
        """Test that empty meshMailboxSenderId values are skipped"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
                {
                    "Name": "/dl/test/mesh/clients/empty_mailbox",
                    "Value": json.dumps({
                        "clientId": "empty",
                        "meshMailboxSenderId": "",  # Empty string
                        "name": "Empty Mailbox Client"
                    })
                },
                create_client_parameter("client3", "MAILBOX_003"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert client_lookup.is_valid_sender("MAILBOX_001")
        assert client_lookup.is_valid_sender("MAILBOX_003")
        assert not client_lookup.is_valid_sender("")

    def test_load_valid_senders_with_trailing_slash_in_path(self):
        """Test that paths with trailing slashes are handled correctly"""
        ssm, config, logger = setup_mocks()
        config.ssm_clients_parameter_path = "/dl/test/mesh/clients/"  # Trailing slash

        ssm.get_parameters_by_path.return_value = {
            "Parameters": [
                create_client_parameter("client1", "MAILBOX_001"),
            ]
        }

        client_lookup = ClientLookup(ssm, config, logger)

        ssm.get_parameters_by_path.assert_called_once_with(
            Path="/dl/test/mesh/clients/",
            WithDecryption=True
        )
        assert client_lookup.is_valid_sender("MAILBOX_001")

    def test_load_valid_senders_handles_empty_response(self):
        """Test that empty SSM response is handled correctly"""
        ssm, config, logger = setup_mocks()

        ssm.get_parameters_by_path.return_value = {
            "Parameters": []
        }

        client_lookup = ClientLookup(ssm, config, logger)

        assert not client_lookup.is_valid_sender("ANY_MAILBOX")
        logger.debug.assert_called_once()
        call_args = logger.debug.call_args[0][0]
        assert "0" in call_args  # Should log count of 0

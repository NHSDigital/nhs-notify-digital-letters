"""
Tests for mesh-poll MeshMessageProcessor
Following the pattern from backend comms-mgr mesh-poll tests
"""
import pytest
from unittest.mock import Mock, call, patch
from mesh_client import MeshClient


def setup_mocks():
    """
    Create all mock objects needed for processor testing
    Similar to backend comms-mgr mesh-poll tests
    """
    config = Mock()
    config.maximum_runtime_milliseconds = "500"
    config.ssm_prefix = "/dl/test/mesh"

    client_lookup = Mock()
    client_lookup.is_valid_sender.return_value = True  # Default to valid sender

    mesh_client = Mock(spec=MeshClient)

    log = Mock()

    polling_metric = Mock()

    return (
        config,
        client_lookup,
        mesh_client,
        log,
        polling_metric
    )


def setup_message_data(test_id="0"):
    """
    Create test message data
    """
    from mesh_client import Message

    message = Mock(spec=Message)
    message.sender = f"TEST_SENDER_{test_id}"
    message.subject = f"test_subject_{test_id}"
    message.local_id = f"test_local_id_{test_id}"
    message.workflow_id = "NHS_NOTIFY_SEND_REQUEST"
    message.message_type = "DATA"
    message.id.return_value = f"test_message_id_{test_id}"
    message.read.return_value = b"test_message_%s_contents" % test_id.encode()

    return message


def get_remaining_time_in_millis():
    return 1000000


def get_remaining_time_in_millis_near_timeout():
    return 100


class TestMeshMessageProcessor:
    """Test suite for MeshMessageProcessor"""

    @patch('src.processor.os.getenv')
    @patch('src.processor.EventPublisher')
    def test_process_messages_iterates_through_inbox(self, mock_event_publisher_class, mock_getenv):
        """Test that processor iterates through all messages in MESH inbox"""
        from src.processor import MeshMessageProcessor

        (config, client_lookup, mesh_client, log, polling_metric) = setup_mocks()
        message1 = setup_message_data("1")
        message2 = setup_message_data("2")

        # Mock environment variables for EventPublisher
        mock_getenv.side_effect = lambda key, default='': {
            'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:eu-west-2:123456789012:event-bus/test',
            'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq'
        }.get(key, default)

        processor = MeshMessageProcessor(
            config=config,
            client_lookup=client_lookup,
            mesh_client=mesh_client,
            get_remaining_time_in_millis=get_remaining_time_in_millis,
            log=log,
            polling_metric=polling_metric
        )

        mesh_client.iterate_all_messages.side_effect = [
            [message1, message2], []]
        client_lookup.is_valid_sender.return_value = True

        processor.process_messages()

        mesh_client.handshake.assert_called_once()
        assert mesh_client.iterate_all_messages.call_count == 2
        # Messages are acknowledged only on auth errors, not on success
        polling_metric.record.assert_called_once()

    @patch('src.processor.os.getenv')
    @patch('src.processor.EventPublisher')
    def test_process_messages_stops_near_timeout(self, mock_event_publisher_class, mock_getenv):
        """Test that processor stops processing when near timeout"""
        from src.processor import MeshMessageProcessor

        (config, client_lookup, mesh_client, log, polling_metric) = setup_mocks()
        message1 = setup_message_data("1")

        # Mock environment variables
        mock_getenv.side_effect = lambda key, default='': {
            'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:eu-west-2:123456789012:event-bus/test',
            'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq'
        }.get(key, default)

        processor = MeshMessageProcessor(
            config=config,
            client_lookup=client_lookup,
            mesh_client=mesh_client,
            get_remaining_time_in_millis=get_remaining_time_in_millis_near_timeout,
            log=log,
            polling_metric=polling_metric
        )

        mesh_client.iterate_all_messages.return_value = [message1]

        processor.process_messages()

        # Should not process messages when near timeout
        client_lookup.is_valid_sender.assert_not_called()
        polling_metric.record.assert_called_once()

    @patch('src.processor.os.getenv')
    @patch('src.processor.EventPublisher')
    def test_process_message_with_valid_sender(self, mock_event_publisher_class, mock_getenv):
        """Test processing a single message from valid sender"""
        from src.processor import MeshMessageProcessor

        (config, client_lookup, mesh_client, log, polling_metric) = setup_mocks()
        message = setup_message_data("1")

        # Mock environment variables
        mock_getenv.side_effect = lambda key, default='': {
            'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:eu-west-2:123456789012:event-bus/test',
            'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq'
        }.get(key, default)

        mock_event_publisher = Mock()
        mock_event_publisher.send_events.return_value = []  # No failed events
        mock_event_publisher_class.return_value = mock_event_publisher

        processor = MeshMessageProcessor(
            config=config,
            client_lookup=client_lookup,
            mesh_client=mesh_client,
            get_remaining_time_in_millis=get_remaining_time_in_millis,
            log=log,
            polling_metric=polling_metric
        )

        client_lookup.is_valid_sender.return_value = True

        processor.process_message(message)

        mesh_client.handshake.assert_called_once()
        client_lookup.is_valid_sender.assert_called_once_with(message.sender)
        mock_event_publisher.send_events.assert_called_once()
        message.acknowledge.assert_not_called()  # Only acknowledged on auth error

    @patch('src.processor.os.getenv')
    @patch('src.processor.EventPublisher')
    def test_process_message_with_unknown_sender(self, mock_event_publisher_class, mock_getenv):
        """Test that messages from unknown senders are rejected silently"""
        from src.processor import MeshMessageProcessor

        (config, client_lookup, mesh_client, log, polling_metric) = setup_mocks()
        message = setup_message_data("1")

        # Mock environment variables
        mock_getenv.side_effect = lambda key, default='': {
            'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:eu-west-2:123456789012:event-bus/test',
            'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq'
        }.get(key, default)

        processor = MeshMessageProcessor(
            config=config,
            client_lookup=client_lookup,
            mesh_client=mesh_client,
            get_remaining_time_in_millis=get_remaining_time_in_millis,
            log=log,
            polling_metric=polling_metric
        )

        # Invalid sender
        client_lookup.is_valid_sender.return_value = False

        processor.process_message(message)

        # Message should be acknowledged (removed from inbox)
        client_lookup.is_valid_sender.assert_called_once_with(message.sender)
        message.acknowledge.assert_called_once()

    @patch('src.processor.os.getenv')
    @patch('src.processor.EventPublisher')
    def test_process_messages_across_multiple_iterations(self, mock_event_publisher_class, mock_getenv):
        """Test that processor continues polling until no messages remain"""
        from src.processor import MeshMessageProcessor

        (config, client_lookup, mesh_client, log, polling_metric) = setup_mocks()
        message1 = setup_message_data("1")
        message2 = setup_message_data("2")
        message3 = setup_message_data("3")

        # Mock environment variables
        mock_getenv.side_effect = lambda key, default='': {
            'EVENT_PUBLISHER_EVENT_BUS_ARN': 'arn:aws:events:eu-west-2:123456789012:event-bus/test',
            'EVENT_PUBLISHER_DLQ_URL': 'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq'
        }.get(key, default)

        processor = MeshMessageProcessor(
            config=config,
            client_lookup=client_lookup,
            mesh_client=mesh_client,
            get_remaining_time_in_millis=get_remaining_time_in_millis,
            log=log,
            polling_metric=polling_metric
        )

        # Messages across multiple iterations
        mesh_client.iterate_all_messages.side_effect = [
            [message1, message2],  # First iteration
            [message3],            # Second iteration
            []                     # Third iteration - empty, stops
        ]
        client_lookup.is_valid_sender.return_value = True

        processor.process_messages()

        mesh_client.handshake.assert_called_once()
        assert mesh_client.iterate_all_messages.call_count == 3
        assert client_lookup.is_valid_sender.call_count == 3
        polling_metric.record.assert_called_once()

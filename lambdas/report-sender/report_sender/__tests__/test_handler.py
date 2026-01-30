"""
Tests for Lambda handler
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from report_sender.reports_store import ReportsStore
from report_sender.handler import handler
from report_sender.mesh_report_sender import MeshReportsSender


def setup_mocks():
    """
    Create all mock objects needed for handler testing
    """
    mock_context = Mock()

    mock_config = MagicMock()
    mock_config.mesh_client = Mock()
    mock_config.s3_client = Mock()
    mock_config.send_metric = Mock()

    mock_ssm = Mock()

    mock_sender_lookup = Mock()

    mock_processor = Mock()
    mock_processor.process_sqs_message = Mock()

    return (
        mock_context,
        mock_config,
        mock_ssm,
        mock_sender_lookup,
        mock_processor
    )


def create_sqs_event(num_records=1, event_source='aws:sqs'):
    """
    Create a mock SQS event for testing
    """
    records = []
    for i in range(num_records):
        records.append({
            'messageId': f'msg-{i}',
            'eventSource': event_source,
            'body': '{"detail": {"data": {"meshMessageId": "test_id"}}}'
        })

    return {'Records': records}


class TestHandler:
    """Test suite for Lambda handler"""

    @patch('report_sender.handler.client')
    @patch('report_sender.handler.EventPublisher')
    @patch('report_sender.handler.SenderLookup')
    @patch('report_sender.handler.ReportSenderProcessor')
    @patch('report_sender.handler.Config')
    def test_handler_success_single_record_on_event(
        self,
        mock_config_class,
        mock_processor_class,
        mock_sender_lookup_class,
        mock_event_publisher_class,
        mock_boto_client
    ):
        """Test successful handler execution"""

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()
        mock_event_publisher = Mock()
        # Wire up the mocks
        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor
        mock_event_publisher_class.return_value = mock_event_publisher

        event = create_sqs_event(num_records=1)

        result = handler(event, mock_context)

        self.assert_object_creation(
            mock_config_class,
            mock_boto_client,
            mock_sender_lookup_class,
            mock_event_publisher_class,
            mock_processor_class,
            mock_ssm,
            mock_config,
            mock_sender_lookup,
            mock_event_publisher
        )

        assert result == {"batchItemFailures": []}
        mock_processor.process_sqs_message.assert_called_once()

    @patch('report_sender.handler.client')
    @patch('report_sender.handler.EventPublisher')
    @patch('report_sender.handler.SenderLookup')
    @patch('report_sender.handler.ReportSenderProcessor')
    @patch('report_sender.handler.Config')
    def test_handler_returns_empty_failures_on_empty_event(
        self,
        mock_config_class,
        mock_processor_class,
        mock_sender_lookup_class,
        mock_event_publisher_class,
        mock_boto_client
    ):
        """Test handler handles empty event gracefully"""

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()
        mock_event_publisher = Mock()

        # Wire up the mocks
        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor
        mock_event_publisher_class.return_value = mock_event_publisher

        event = create_sqs_event(num_records=0)

        result = handler(event, mock_context)

        self.assert_object_creation(
            mock_config_class,
            mock_boto_client,
            mock_sender_lookup_class,
            mock_event_publisher_class,
            mock_processor_class,
            mock_ssm,
            mock_config,
            mock_sender_lookup,
            mock_event_publisher
        )

        assert result == {"batchItemFailures": []}
        mock_processor.process_sqs_message.assert_not_called()

    @patch('report_sender.handler.client')
    @patch('report_sender.handler.EventPublisher')
    @patch('report_sender.handler.SenderLookup')
    @patch('report_sender.handler.ReportSenderProcessor')
    @patch('report_sender.handler.Config')
    def test_handler_success_multiple_success_error_records_in_event(
        self,
        mock_config_class,
        mock_processor_class,
        mock_sender_lookup_class,
        mock_event_publisher_class,
        mock_boto_client
    ):
        """Test successful handler execution with multiple records, some failing"""

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()
        mock_event_publisher = Mock()

        # Wire up the mocks
        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor
        mock_event_publisher_class.return_value = mock_event_publisher

        # Make second and fourth message fail
        mock_processor.process_sqs_message.side_effect = [
            None,
            Exception("Test error"),
            None,
            Exception("Test error 2"),
            None
        ]

        event = create_sqs_event(num_records=5)

        result = handler(event, mock_context)

        self.assert_object_creation(
            mock_config_class,
            mock_boto_client,
            mock_sender_lookup_class,
            mock_event_publisher_class,
            mock_processor_class,
            mock_ssm,
            mock_config,
            mock_sender_lookup,
            mock_event_publisher
        )

        assert result == {"batchItemFailures": [
            {
                'itemIdentifier': 'msg-1',
            },
            {
                'itemIdentifier': 'msg-3',
            }
        ]}
        assert mock_processor.process_sqs_message.call_count == 5

    @patch('report_sender.handler.client')
    @patch('report_sender.handler.EventPublisher')
    @patch('report_sender.handler.SenderLookup')
    @patch('report_sender.handler.ReportSenderProcessor')
    @patch('report_sender.handler.Config')
    def test_handler_skips_non_sqs_records(
        self,
        mock_config_class,
        mock_processor_class,
        mock_sender_lookup_class,
        mock_event_publisher_class,
        mock_boto_client
    ):
        """Test that handler skips non-SQS records"""

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()
        mock_event_publisher = Mock()

        # Wire up the mocks
        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor
        mock_event_publisher_class.return_value = mock_event_publisher

        event = create_sqs_event(num_records=1, event_source='aws:sns')

        result = handler(event, mock_context)

        mock_processor.process_sqs_message.assert_not_called()
        assert result == {"batchItemFailures": []}

    @patch('report_sender.handler.Config')
    def test_handler_raises_exception_on_config_failure(
        self,
        mock_config_class,
    ):
        """Test that handler raises exception when Config initialization fails"""

        mock_context = Mock()
        mock_config_class.return_value.__enter__.side_effect = Exception("Config error")

        event = create_sqs_event(num_records=1)

        with pytest.raises(Exception, match="Config error"):
            handler(event, mock_context)

    def assert_object_creation(
        self,
        mock_config_class,
        mock_boto_client,
        mock_sender_lookup_class,
        mock_event_publisher_class,
        mock_processor_class,
        mock_ssm,
        mock_config,
        mock_sender_lookup,
        mock_event_publisher
        ):
        """Helper method to assert object creation and initialization"""

        # Verify Config was created and used as context manager
        mock_config_class.assert_called_once()
        mock_config_class.return_value.__enter__.assert_called_once()

        # Verify SSM client was created
        mock_boto_client.assert_called_once_with('ssm')

        # Verify EventPublisher was created with correct parameters
        mock_event_publisher_class.assert_called_once()
        ep_kwargs = mock_event_publisher_class.call_args[1]
        assert ep_kwargs['event_bus_arn'] == mock_config.event_publisher_event_bus_arn
        assert ep_kwargs['dlq_url'] == mock_config.event_publisher_dlq_url
        assert 'logger' in ep_kwargs

        # Verify SenderLookup was created with correct parameters (positional args)
        mock_sender_lookup_class.assert_called_once()
        sl_args = mock_sender_lookup_class.call_args[0]  # Positional args
        assert sl_args[0] == mock_ssm
        assert sl_args[1] == mock_config

        # Verify ReportSenderProcessor was created with correct parameters
        mock_processor_class.assert_called_once()
        mock_processor_args = mock_processor_class.call_args[1]
        assert mock_processor_args['config'] == mock_config
        assert mock_processor_args['sender_lookup'] == mock_sender_lookup
        assert isinstance(mock_processor_args['mesh_report_sender'], MeshReportsSender)
        assert isinstance(mock_processor_args['reports_store'], ReportsStore)
        assert mock_processor_args['event_publisher'] == mock_event_publisher
        assert mock_processor_args['send_metric'] == mock_config.send_metric
        assert 'log' in mock_processor_args

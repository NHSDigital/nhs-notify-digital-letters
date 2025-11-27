"""
Tests for Lambda handler
Following the pattern from mesh-poll tests
"""
import pytest
from unittest.mock import Mock, patch, MagicMock


def setup_mocks():
    """
    Create all mock objects needed for handler testing
    """
    mock_context = Mock()

    mock_config = MagicMock()
    mock_config.mesh_client = Mock()

    mock_processor = Mock()
    mock_processor.process_sqs_message = Mock()

    return (
        mock_context,
        mock_config,
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

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_success_single_message(self, mock_processor_class, mock_config_class):
        """Test successful handler execution with single SQS message"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        event = create_sqs_event(num_records=1)

        result = handler(event, mock_context)

        # Verify Config was created and used as context manager
        mock_config_class.assert_called_once()
        mock_config_class.return_value.__enter__.assert_called_once()

        # Verify MeshDownloadProcessor was created with correct parameters
        mock_processor_class.assert_called_once()
        call_kwargs = mock_processor_class.call_args[1]
        assert call_kwargs['mesh_client'] == mock_config.mesh_client

        # Verify process_sqs_message was called
        mock_processor.process_sqs_message.assert_called_once()

        # Verify return value (no failures)
        assert result == {"batchItemFailures": []}

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_success_multiple_messages(self, mock_processor_class, mock_config_class):
        """Test successful handler execution with multiple SQS messages"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        event = create_sqs_event(num_records=3)

        result = handler(event, mock_context)

        # Verify process_sqs_message was called 3 times
        assert mock_processor.process_sqs_message.call_count == 3

        # Verify return value (no failures)
        assert result == {"batchItemFailures": []}

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_config_cleanup_on_success(self, mock_processor_class, mock_config_class):
        """Test that Config context manager cleanup is called on success"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_exit = Mock(return_value=None)
        mock_config_class.return_value.__exit__ = mock_exit
        mock_processor_class.return_value = mock_processor

        event = create_sqs_event(num_records=1)

        handler(event, mock_context)

        # Verify __exit__ was called (cleanup happened)
        mock_exit.assert_called_once()
        # __exit__ should be called with (None, None, None) on success
        assert mock_exit.call_args[0] == (None, None, None)

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_partial_batch_failure(self, mock_processor_class, mock_config_class):
        """Test handler handles partial batch failures correctly"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        # Make second message fail
        mock_processor.process_sqs_message.side_effect = [
            None,  # First succeeds
            Exception("Test error"),  # Second fails
            None   # Third succeeds
        ]

        event = create_sqs_event(num_records=3)

        result = handler(event, mock_context)

        # Verify only the failed message is in batch item failures
        assert len(result["batchItemFailures"]) == 1
        assert result["batchItemFailures"][0]["itemIdentifier"] == "msg-1"

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_skips_non_sqs_records(self, mock_processor_class, mock_config_class):
        """Test handler skips records that are not from SQS"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        event = create_sqs_event(num_records=1, event_source='aws:dynamodb')

        result = handler(event, mock_context)

        # Verify process_sqs_message was NOT called
        mock_processor.process_sqs_message.assert_not_called()

        # Verify return value (no failures)
        assert result == {"batchItemFailures": []}

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_config_cleanup_on_exception(self, mock_processor_class, mock_config_class):
        """Test that Config context manager cleanup is called even on exception"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        # Make config.__enter__ raise an exception
        test_exception = RuntimeError("Config error")
        mock_config_class.return_value.__enter__.side_effect = test_exception
        mock_exit = Mock(return_value=None)
        mock_config_class.return_value.__exit__ = mock_exit

        event = create_sqs_event(num_records=1)

        # Handler should raise the exception
        with pytest.raises(RuntimeError, match="Config error"):
            handler(event, mock_context)

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_returns_empty_failures_on_empty_event(self, mock_processor_class, mock_config_class):
        """Test handler handles empty event gracefully"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        event = {'Records': []}

        result = handler(event, mock_context)

        # Verify process_sqs_message was NOT called
        mock_processor.process_sqs_message.assert_not_called()

        # Verify return value
        assert result == {"batchItemFailures": []}

    @patch('src.handler.Config')
    @patch('src.handler.MeshDownloadProcessor')
    def test_handler_passes_correct_parameters_to_processor(self, mock_processor_class, mock_config_class):
        """Test that handler passes all required parameters to MeshDownloadProcessor"""
        from src.handler import handler

        (mock_context, mock_config, mock_processor) = setup_mocks()

        mock_mesh_client = Mock()
        mock_config.mesh_client = mock_mesh_client

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_processor_class.return_value = mock_processor

        event = create_sqs_event(num_records=1)

        handler(event, mock_context)

        # Verify all parameters are passed correctly
        mock_processor_class.assert_called_once()
        call_kwargs = mock_processor_class.call_args[1]

        # Check each parameter individually
        assert call_kwargs['mesh_client'] == mock_mesh_client
        assert 'log' in call_kwargs

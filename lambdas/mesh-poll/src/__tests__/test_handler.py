"""
Tests for Lambda handler
"""
import pytest
from unittest.mock import Mock, patch, MagicMock


def setup_mocks():
    """
    Create all mock objects needed for handler testing
    """
    mock_context = Mock()
    mock_context.get_remaining_time_in_millis = Mock(return_value=300000)

    mock_config = MagicMock()
    mock_config.mesh_client = Mock()
    mock_config.polling_metric = Mock()

    mock_ssm = Mock()

    mock_sender_lookup = Mock()

    mock_processor = Mock()
    mock_processor.process_messages = Mock()

    return (
        mock_context,
        mock_config,
        mock_ssm,
        mock_sender_lookup,
        mock_processor
    )


class TestHandler:
    """Test suite for Lambda handler"""

    @patch('src.handler.Config')
    @patch('src.handler.SenderLookup')
    @patch('src.handler.MeshMessageProcessor')
    @patch('src.handler.client')
    def test_handler_success(self, mock_boto_client, mock_processor_class, mock_sender_lookup_class, mock_config_class):
        """Test successful handler execution"""
        from src.handler import handler

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()

        # Wire up the mocks
        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor

        # Execute handler
        handler(None, mock_context)

        # Verify Config was created and used as context manager
        mock_config_class.assert_called_once()
        mock_config_class.return_value.__enter__.assert_called_once()

        # Verify SSM client was created
        mock_boto_client.assert_called_once_with('ssm')

        # Verify SenderLookup was created with correct parameters
        mock_sender_lookup_class.assert_called_once()
        call_args = mock_sender_lookup_class.call_args
        assert call_args[0][0] == mock_ssm
        assert call_args[0][1] == mock_config

        # Verify MeshMessageProcessor was created with correct parameters
        mock_processor_class.assert_called_once()
        call_kwargs = mock_processor_class.call_args[1]
        assert call_kwargs['config'] == mock_config
        assert call_kwargs['sender_lookup'] == mock_sender_lookup
        assert call_kwargs['mesh_client'] == mock_config.mesh_client
        assert call_kwargs['get_remaining_time_in_millis'] == mock_context.get_remaining_time_in_millis
        assert call_kwargs['polling_metric'] == mock_config.polling_metric

        # Verify process_messages was called
        mock_processor.process_messages.assert_called_once()

    @patch('src.handler.Config')
    @patch('src.handler.SenderLookup')
    @patch('src.handler.MeshMessageProcessor')
    @patch('src.handler.client')
    def test_handler_config_cleanup_on_exception(self, mock_boto_client, mock_processor_class, mock_sender_lookup_class, mock_config_class):
        """Test that Config context manager cleanup is called even on exception"""
        from src.handler import handler

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()

        # Make processor raise an exception
        test_exception = RuntimeError("Test error")
        mock_processor.process_messages.side_effect = test_exception

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_exit = Mock(return_value=None)
        mock_config_class.return_value.__exit__ = mock_exit
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor

        # Handler should raise the exception
        with pytest.raises(RuntimeError, match="Test error"):
            handler(None, mock_context)

        # Verify __exit__ was still called (cleanup happened)
        mock_exit.assert_called_once()
        # __exit__ should be called with exception info on error
        call_args = mock_exit.call_args[0]
        assert call_args[0] == RuntimeError
        assert call_args[1] == test_exception

    @patch('src.handler.Config')
    @patch('src.handler.SenderLookup')
    @patch('src.handler.MeshMessageProcessor')
    @patch('src.handler.client')
    def test_handler_passes_correct_parameters_to_processor(self, mock_boto_client, mock_processor_class, mock_sender_lookup_class, mock_config_class):
        """Test that handler passes all required parameters to MeshMessageProcessor"""
        from src.handler import handler

        (mock_context, mock_config, mock_ssm,
        mock_sender_lookup, mock_processor) = setup_mocks()

        mock_remaining_time_func = Mock(return_value=250000)
        mock_context.get_remaining_time_in_millis = mock_remaining_time_func
        mock_mesh_client = Mock()
        mock_polling_metric = Mock()
        mock_config.mesh_client = mock_mesh_client
        mock_config.polling_metric = mock_polling_metric

        mock_config_class.return_value.__enter__.return_value = mock_config
        mock_config_class.return_value.__exit__ = Mock(return_value=None)
        mock_boto_client.return_value = mock_ssm
        mock_sender_lookup_class.return_value = mock_sender_lookup
        mock_processor_class.return_value = mock_processor

        handler(None, mock_context)

        mock_processor_class.assert_called_once()
        call_kwargs = mock_processor_class.call_args[1]

        assert call_kwargs['config'] == mock_config
        assert call_kwargs['sender_lookup'] == mock_sender_lookup
        assert call_kwargs['mesh_client'] == mock_mesh_client
        assert call_kwargs['get_remaining_time_in_millis'] == mock_remaining_time_func
        assert call_kwargs['polling_metric'] == mock_polling_metric
        assert 'log' in call_kwargs

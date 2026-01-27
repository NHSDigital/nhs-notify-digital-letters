"""
Tests for Dlq class in mesh_acknowledge.dlq
"""
import json
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from mesh_acknowledge.dlq import Dlq


@pytest.fixture(name='mock_sqs_client')
def create_mock_sqs_client():
    """Create a mock SQS client for testing"""
    client = Mock()
    client.send_message = Mock(return_value={'MessageId': 'msg-12345'})
    return client


@pytest.fixture(name='mock_logger')
def create_mock_logger():
    """Create a mock logger for testing"""
    logger = Mock()
    logger.info = Mock()
    logger.error = Mock()
    return logger

@pytest.fixture(name='dlq_url')
def create_dlq_url():
    """Create a DLQ URL for testing"""
    return "https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq"

@pytest.fixture(name='dlq')
def create_dlq(mock_sqs_client, mock_logger, dlq_url):
    """Create a Dlq instance for testing"""
    return Dlq(
        sqs_client=mock_sqs_client,
        dlq_url=dlq_url,
        logger=mock_logger
    )


class TestSendToQueue:
    """Tests for send_to_queue method"""

    def test_sends_record_to_dlq_successfully(
        self,
        dlq,
        mock_sqs_client,
        dlq_url
    ):
        """Test that a record is sent to DLQ successfully"""
        record = {
            "id": "test-event-123",
            "type": "test.event.v1",
            "data": {"key": "value"}
        }
        reason = "Validation failed"

        dlq.send_to_queue(record, reason)

        mock_sqs_client.send_message.assert_called_once_with(
            QueueUrl=dlq_url,
            MessageBody=json.dumps(record),
            MessageAttributes={
                'DlqReason': {
                    'DataType': 'String',
                    'StringValue': reason
                }
            }
        )

    def test_handles_sqs_client_error(
        self,
        dlq,
        mock_sqs_client,
    ):
        """Test that ClientError from SQS is handled and re-raised"""
        record = {"id": "test-event-123"}
        reason = "Processing error"
        error = ClientError(
            {'Error': {'Code': 'InvalidParameterValue', 'Message': 'Invalid queue URL'}},
            'SendMessage'
        )
        mock_sqs_client.send_message.side_effect = error

        with pytest.raises(ClientError):
            dlq.send_to_queue(record, reason)

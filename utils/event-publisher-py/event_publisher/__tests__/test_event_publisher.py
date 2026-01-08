import json
import pytest
from unittest.mock import Mock, MagicMock, call
from uuid import uuid4
from botocore.exceptions import ClientError

from event_publisher import EventPublisher


@pytest.fixture
def mock_logger():
    logger = Mock()
    logger.info = Mock()
    logger.warning = Mock()
    logger.error = Mock()
    return logger


@pytest.fixture
def mock_events_client():
    return Mock()


@pytest.fixture
def mock_sqs_client():
    return Mock()


@pytest.fixture
def test_config(mock_logger, mock_events_client, mock_sqs_client):
    return {
        'event_bus_arn': 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
        'dlq_url': 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        'logger': mock_logger,
        'events_client': mock_events_client,
        'sqs_client': mock_sqs_client,
    }


@pytest.fixture
def valid_cloud_event():
    return {
        'profileversion': '1.0.0',
        'profilepublished': '2025-10',
        'id': '550e8400-e29b-41d4-a716-446655440001',
        'specversion': '1.0',
        'source': '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
        'subject': 'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
        'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1',
        'time': '2023-06-20T12:00:00Z',
        'recordedtime': '2023-06-20T12:00:00.250Z',
        'severitynumber': 2,
        'severitytext': 'INFO',
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letters-mesh-inbox-message-received-data.schema.json',
        'dataschemaversion': '1.0',
        'data': {
            'meshMessageId': 'test-123',
            'senderId': 'sender1',
            'messageReference': 'ref_001'
        },
    }


@pytest.fixture
def valid_cloud_event2():
    return {
        'profileversion': '1.0.0',
        'profilepublished': '2025-10',
        'id': '550e8400-e29b-41d4-a716-446655440002',
        'specversion': '1.0',
        'source': '/nhs/england/notify/development/primary/data-plane/digitalletters/mesh',
        'subject': 'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
        'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1',
        'time': '2023-06-20T12:00:00Z',
        'recordedtime': '2023-06-20T12:00:00.250Z',
        'severitynumber': 2,
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letters-mesh-inbox-message-received-data.schema.json',
        'dataschemaversion': '1.0',
        'data': {
            'meshMessageId': 'test-123',
            'senderId': 'sender1',
            'messageReference': 'ref_001'
        },
    }

@pytest.fixture(name='mock_validator')
def create_mock_validator():
    def validator(**_kwargs):
        ## Validation always succeeds.
        pass
    return validator


@pytest.fixture(name='mock_failing_validator')
def create_mock_failing_validator():
    def validator(**_kwargs):
        raise ValueError('Validation failed')
    return validator


class TestEventPublishing:

    def test_should_return_empty_array_when_no_events_provided(
            self, test_config, mock_events_client, mock_sqs_client, mock_validator):
        publisher = EventPublisher(**test_config)
        result = publisher.send_events([], validator=mock_validator)

        assert result == []
        mock_events_client.put_events.assert_not_called()
        mock_sqs_client.send_message_batch.assert_not_called()

    def test_should_send_valid_events_to_eventbridge(
            self, test_config, mock_events_client, mock_sqs_client,
            valid_cloud_event, valid_cloud_event2, mock_validator):
        mock_events_client.put_events.return_value = {
            'FailedEntryCount': 0,
            'Entries': [{'EventId': 'event-1'}]
        }
        mock_sqs_client.send_message_batch.return_value = {
            'Successful': []
        }

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event, valid_cloud_event2],
                                        validator=mock_validator)

        assert result == []
        assert mock_events_client.put_events.call_count == 1

        call_args = mock_events_client.put_events.call_args[1]
        assert len(call_args['Entries']) == 2
        assert call_args['Entries'][0]['Source'] == valid_cloud_event['source']
        assert call_args['Entries'][0]['DetailType'] == valid_cloud_event['type']
        assert call_args['Entries'][0]['Detail'] == json.dumps(valid_cloud_event)
        assert call_args['Entries'][0]['EventBusName'] == test_config['event_bus_arn']

    def test_should_send_invalid_events_directly_to_dlq(
            self, test_config, mock_sqs_client, valid_cloud_event, mock_failing_validator):
        mock_sqs_client.send_message_batch.return_value = {
            'Successful': [{'Id': 'msg-1', 'MessageId': 'success-1', 'MD5OfMessageBody': 'hash1'}]
        }

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event], validator=mock_failing_validator)

        assert result == []
        assert mock_sqs_client.send_message_batch.call_count == 1

        call_args = mock_sqs_client.send_message_batch.call_args[1]
        assert call_args['QueueUrl'] == test_config['dlq_url']
        assert len(call_args['Entries']) == 1
        assert call_args['Entries'][0]['MessageBody'] == json.dumps(valid_cloud_event)
        assert call_args['Entries'][0]['MessageAttributes']['DlqReason']['StringValue'] == 'INVALID_EVENT'

    def test_should_send_failed_eventbridge_events_to_dlq(
            self, test_config, mock_events_client, mock_sqs_client,
            valid_cloud_event, valid_cloud_event2, mock_validator):
        mock_events_client.put_events.return_value = {
            'FailedEntryCount': 1,
            'Entries': [
                {'ErrorCode': 'InternalFailure', 'ErrorMessage': 'Internal error'},
                {'EventId': 'event-2'}
            ]
        }
        mock_sqs_client.send_message_batch.return_value = {
            'Successful': [{'Id': 'msg-1', 'MessageId': 'success-1', 'MD5OfMessageBody': 'hash1'}]
        }

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event, valid_cloud_event2],
                                        validator=mock_validator)

        assert result == []
        assert mock_events_client.put_events.call_count == 1
        # Should call DLQ once for the failed event
        assert mock_sqs_client.send_message_batch.call_count == 1

        # Verify EventBridge was called with both events
        eventbridge_call_args = mock_events_client.put_events.call_args[1]
        assert len(eventbridge_call_args['Entries']) == 2

        # Verify DLQ gets the failed event (first one)
        dlq_call_args = mock_sqs_client.send_message_batch.call_args[1]
        assert len(dlq_call_args['Entries']) == 1
        assert dlq_call_args['Entries'][0]['MessageBody'] == json.dumps(valid_cloud_event)
        assert dlq_call_args['Entries'][0]['MessageAttributes']['DlqReason']['StringValue'] == 'EVENTBRIDGE_FAILURE'

    def test_should_handle_eventbridge_send_error_and_send_all_events_to_dlq(
            self, test_config, mock_events_client, mock_sqs_client,
            valid_cloud_event, valid_cloud_event2, mock_validator):
        mock_events_client.put_events.side_effect = ClientError(
            {'Error': {'Code': 'InternalError', 'Message': 'EventBridge error'}},
            'PutEvents'
        )
        mock_sqs_client.send_message_batch.return_value = {
            'Successful': [{'Id': 'msg-1', 'MessageId': 'success-1', 'MD5OfMessageBody': 'hash1'}]
        }

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event, valid_cloud_event2],
                                        validator=mock_validator)

        assert result == []
        assert mock_events_client.put_events.call_count == 1
        # Should call DLQ once for all events after EventBridge failure
        assert mock_sqs_client.send_message_batch.call_count == 1

    def test_should_return_failed_events_when_dlq_also_fails(
            self, test_config, mock_sqs_client, valid_cloud_event, mock_failing_validator):
        def mock_send_message_batch(**kwargs):
            first_entry_id = kwargs['Entries'][0]['Id']
            return {
                'Failed': [{
                    'Id': first_entry_id,
                    'Code': 'SenderFault',
                    'Message': 'Invalid message',
                    'SenderFault': True
                }]
            }

        mock_sqs_client.send_message_batch.side_effect = mock_send_message_batch

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event], validator=mock_failing_validator)

        assert result == [valid_cloud_event]
        assert mock_sqs_client.send_message_batch.call_count == 1

    def test_should_handle_dlq_send_error_and_return_all_events_as_failed(
            self, test_config, mock_sqs_client, valid_cloud_event, mock_failing_validator):
        mock_sqs_client.send_message_batch.side_effect = ClientError(
            {'Error': {'Code': 'InternalError', 'Message': 'DLQ error'}},
            'SendMessageBatch'
        )

        publisher = EventPublisher(**test_config)
        result = publisher.send_events([valid_cloud_event], validator=mock_failing_validator)

        assert result == [valid_cloud_event]
        assert mock_sqs_client.send_message_batch.call_count == 1

    def test_should_send_to_eventbridge_in_batches(
            self, test_config, mock_events_client, valid_cloud_event, mock_validator):
        large_event_array = [
            {**valid_cloud_event, 'id': str(uuid4())}
            for _ in range(25)
        ]

        mock_events_client.put_events.return_value = {
            'FailedEntryCount': 0,
            'Entries': [{'EventId': 'success'}]
        }

        publisher = EventPublisher(**test_config)
        result = publisher.send_events(large_event_array, validator=mock_validator)

        assert result == []
        assert mock_events_client.put_events.call_count == 3

        # Verify batch sizes: 10, 10, 5
        calls = mock_events_client.put_events.call_args_list
        assert len(calls[0][1]['Entries']) == 10
        assert len(calls[1][1]['Entries']) == 10
        assert len(calls[2][1]['Entries']) == 5

    def test_should_send_to_dlq_in_batches(
            self, test_config, mock_sqs_client, valid_cloud_event, mock_failing_validator):
        large_event_array = [
            {**valid_cloud_event, 'id': str(uuid4())}
            for _ in range(25)
        ]

        def mock_send_message_batch(**kwargs):
            return {
                'Failed': [{
                    'Id': entry['Id'],
                    'Code': 'SenderFault',
                    'Message': 'Invalid message',
                    'SenderFault': True
                } for entry in kwargs['Entries']]
            }

        mock_sqs_client.send_message_batch.side_effect = mock_send_message_batch

        publisher = EventPublisher(**test_config)
        result = publisher.send_events(large_event_array, validator=mock_failing_validator)

        assert len(result) == 25
        assert mock_sqs_client.send_message_batch.call_count == 3

        # Verify batch sizes: 10, 10, 5
        calls = mock_sqs_client.send_message_batch.call_args_list
        assert len(calls[0][1]['Entries']) == 10
        assert len(calls[1][1]['Entries']) == 10
        assert len(calls[2][1]['Entries']) == 5


class TestEventPublisherClass:

    def test_should_throw_error_when_event_bus_arn_is_missing(self, test_config):
        test_config['event_bus_arn'] = ''
        with pytest.raises(ValueError, match='event_bus_arn has not been specified'):
            EventPublisher(**test_config)

    def test_should_throw_error_when_dlq_url_is_missing(self, test_config):
        test_config['dlq_url'] = ''
        with pytest.raises(ValueError, match='dlq_url has not been specified'):
            EventPublisher(**test_config)

    def test_should_be_reusable_for_multiple_calls(
            self, test_config, mock_events_client, mock_sqs_client,
            valid_cloud_event, valid_cloud_event2, mock_validator):
        mock_events_client.put_events.return_value = {
            'FailedEntryCount': 0,
            'Entries': [{'EventId': 'event-1'}]
        }
        mock_sqs_client.send_message_batch.return_value = {
            'Successful': []
        }

        publisher = EventPublisher(**test_config)

        # First call
        result1 = publisher.send_events([valid_cloud_event], validator=mock_validator)
        assert result1 == []

        # Second call with same publisher instance
        result2 = publisher.send_events([valid_cloud_event2], validator=mock_validator)
        assert result2 == []

        assert mock_events_client.put_events.call_count == 2

"""
EventPublisher - Python implementation for publishing CloudEvents to EventBridge.

This module provides a Python equivalent of the TypeScript EventPublisher class.
"""

import json
import logging
from typing import List, Dict, Any, Optional, Literal, Callable
from uuid import uuid4
import boto3
from botocore.exceptions import ClientError


DlqReason = Literal['INVALID_EVENT', 'EVENTBRIDGE_FAILURE']
MAX_BATCH_SIZE = 10


class EventPublisher:
    """
    Publisher for CloudEvents to AWS EventBridge with DLQ support.

    Validates events, sends them to EventBridge in batches, and routes
    failed events to a Dead Letter Queue (DLQ) for later processing.
    """

    def __init__(
        self,
        event_bus_arn: str,
        dlq_url: str,
        logger: Optional[logging.Logger] = None,
        events_client: Optional[Any] = None,
        sqs_client: Optional[Any] = None
    ):
        """
        Initialize the EventPublisher.
        """
        if not event_bus_arn:
            raise ValueError('event_bus_arn has not been specified')
        if not dlq_url:
            raise ValueError('dlq_url has not been specified')

        self.event_bus_arn = event_bus_arn
        self.dlq_url = dlq_url
        self.logger = logger or logging.getLogger(__name__)
        self.events_client = events_client or boto3.client('events')
        self.sqs_client = sqs_client or boto3.client('sqs')

    def _validate_cloud_event(self, event: Dict[str, Any], validator: Callable[..., Any]) -> tuple[bool, Optional[str]]:
        """
        Validate event using the specified validator function.
        """
        try:
            validator(**event)
            return (True, None)
        except Exception as e:
            return (False, str(e))

    def _send_to_event_bridge(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Send events to EventBridge in batches.
        """
        failed_events = []

        self.logger.info(
            f"Sending {len(events)} events to EventBridge",
            extra={
                'event_bus_arn': self.event_bus_arn,
                'event_count': len(events)
            }
        )

        for i in range(0, len(events), MAX_BATCH_SIZE):
            batch = events[i:i + MAX_BATCH_SIZE]

            self.logger.info(
                f"Sending batch of {len(batch)} events to EventBridge",
                extra={
                    'event_bus_arn': self.event_bus_arn,
                    'batch_size': len(batch)
                }
            )

            try:
                entries = [
                    {
                        'Source': event['source'],
                        'DetailType': event['type'],
                        'Detail': json.dumps(event),
                        'EventBusName': self.event_bus_arn
                    }
                    for event in batch
                ]

                response = self.events_client.put_events(Entries=entries)

                failed_count = response.get('FailedEntryCount', 0)
                success_count = len(batch) - failed_count

                self.logger.info(
                    'EventBridge batch sent',
                    extra={
                        'batch_size': len(batch),
                        'failed_entry_count': failed_count,
                        'successful_count': success_count
                    }
                )

                # Track failed entries
                if failed_count > 0 and 'Entries' in response:
                    for idx, entry in enumerate(response['Entries']):
                        if 'ErrorCode' in entry:
                            self.logger.warning(
                                'Event failed to send to EventBridge',
                                extra={
                                    'error_code': entry.get('ErrorCode'),
                                    'error_message': entry.get('ErrorMessage'),
                                    'event_id': batch[idx].get('id')
                                }
                            )
                            failed_events.append(batch[idx])

            except ClientError as error:
                self.logger.warning(
                    'EventBridge send error',
                    extra={
                        'error': str(error),
                        'batch_size': len(batch)
                    }
                )
                failed_events.extend(batch)

        return failed_events

    def _send_to_dlq(
        self,
        events: List[Dict[str, Any]],
        reason: DlqReason
    ) -> List[Dict[str, Any]]:
        """
        Send failed events to the Dead Letter Queue.
        """
        failed_dlqs = []

        self.logger.warning(
            'Sending failed events to DLQ',
            extra={
                'dlq_url': self.dlq_url,
                'event_count': len(events),
                'reason': reason
            }
        )

        for i in range(0, len(events), MAX_BATCH_SIZE):
            batch = events[i:i + MAX_BATCH_SIZE]
            id_to_event_map = {}

            entries = []
            for event in batch:
                entry_id = str(uuid4())
                id_to_event_map[entry_id] = event
                entries.append({
                    'Id': entry_id,
                    'MessageBody': json.dumps(event),
                    'MessageAttributes': {
                        'DlqReason': {
                            'DataType': 'String',
                            'StringValue': reason
                        }
                    }
                })

            try:
                response = self.sqs_client.send_message_batch(
                    QueueUrl=self.dlq_url,
                    Entries=entries
                )

                # Track failed DLQ sends
                if 'Failed' in response:
                    for failed_entry in response['Failed']:
                        entry_id = failed_entry.get('Id')
                        if entry_id and entry_id in id_to_event_map:
                            failed_event = id_to_event_map[entry_id]
                            self.logger.warning(
                                'Event failed to send to DLQ',
                                extra={
                                    'error_code': failed_entry.get('Code'),
                                    'error_message': failed_entry.get('Message'),
                                    'event_id': failed_event.get('id')
                                }
                            )
                            failed_dlqs.append(failed_event)

            except ClientError as error:
                self.logger.warning(
                    'DLQ send error',
                    extra={
                        'error': str(error),
                        'dlq_url': self.dlq_url,
                        'batch_size': len(batch)
                    }
                )
                failed_dlqs.extend(batch)

        if failed_dlqs:
            self.logger.error(
                'Failed to send events to DLQ',
                extra={
                    'failed_event_count': len(failed_dlqs),
                    'dlq_url': self.dlq_url
                }
            )

        return failed_dlqs

    def send_events(self, events: List[Dict[str, Any]],
                    validator: Callable[..., Any]) -> List[Dict[str, Any]]:
        """
        Send CloudEvents to EventBridge with validation and DLQ support.

        1. Validates events using the specified validator function
        2. Sends valid events to EventBridge
        3. Routes failed events to DLQ
        """
        if not events:
            self.logger.info('No events to send')
            return []

        valid_events = []
        invalid_events = []

        # Validate events using Pydantic
        for event in events:
            is_valid, error_msg = self._validate_cloud_event(event, validator)
            if is_valid:
                valid_events.append(event)
            else:
                invalid_events.append(event)
                self.logger.warning(
                    'Event validation failed',
                    extra={
                        'event_id': event.get('id', 'unknown'),
                        'validation_error': error_msg
                    }
                )

        self.logger.info(
            'Event validation completed',
            extra={
                'valid_event_count': len(valid_events),
                'invalid_event_count': len(invalid_events),
                'total_event_count': len(events)
            }
        )

        total_failed_events = []

        # Send invalid events to DLQ
        if invalid_events:
            failed_dlq_sends = self._send_to_dlq(invalid_events, 'INVALID_EVENT')
            total_failed_events.extend(failed_dlq_sends)

        # Send valid events to EventBridge
        if valid_events:
            failed_sends = self._send_to_event_bridge(valid_events)
            if failed_sends:
                failed_dlq_sends = self._send_to_dlq(failed_sends, 'EVENTBRIDGE_FAILURE')
                total_failed_events.extend(failed_dlq_sends)

        return total_failed_events

"""
Processes SQS messages containing MESHInboxMessageDownloaded events
and sends Mesh acknowledgements for each.
"""
from typing import Dict, Any, List
from event_publisher import EventPublisher
from sender_management import SenderLookup
from .acknowledger import MeshAcknowledger
from .events import parse_downloaded_event, publish_acknowledged_event


class MessageProcessor:
    """Processes SQS messages and sends MESH acknowledgments."""

    def __init__(
            self, acknowledger: MeshAcknowledger,
            event_publisher: EventPublisher, sender_lookup: SenderLookup, logger):
        self.__acknowledger = acknowledger
        self.__event_publisher = event_publisher
        self.__sender_lookup = sender_lookup
        self.__log = logger

    def process_message(self, message: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Processes a single SQS message.

        Args:
            message (Dict[str, Any]): The SQS message.
            Returns:
                List of batch item failures for failed messages.
        """

        self.__log.info("Received SQS message",
                        record_count=len(message.get('Records', [])))

        batch_item_failures = []
        processed = {
            'retrieved': 0,
            'acknowledged': 0,
            'failed': 0
        }

        for record in message.get('Records', []):
            processed['retrieved'] += 1
            message_id = record.get('messageId')

            if record.get('eventSource') != 'aws:sqs':
                self.__log.warn("Skipping non-SQS record",
                                message_id=message_id)
                continue

            try:
                validated_event = parse_downloaded_event(self.__log, record)

                sender_id = validated_event.data.senderId
                incoming_message_id = validated_event.data.meshMessageId

                mesh_mailbox_id = self.__sender_lookup.get_mailbox_id(
                    sender_id)

                acknowledgement_message_id = self.__acknowledger.acknowledge_message(
                    mailbox_id=mesh_mailbox_id,
                    message_reference=validated_event.data.messageReference,
                    sender_id=sender_id,
                    message_id=incoming_message_id
                )

                publish_acknowledged_event(
                    logger=self.__log,
                    event_publisher=self.__event_publisher,
                    incoming_event=validated_event,
                    mesh_mailbox_id=mesh_mailbox_id
                )

                self.__log.info("Acknowledged message ID",
                                message_id=message_id,
                                incoming_message_id=incoming_message_id,
                                acknowledgement_message_id=acknowledgement_message_id)
                processed['acknowledged'] += 1

            except Exception as e:
                processed['failed'] += 1
                self.__log.error(
                    "Failed to process SQS message",
                    message_id=message_id,
                    error=str(e))
                batch_item_failures.append({"itemIdentifier": message_id})

        self.__log.info("Processed SQS message",
                        retrieved=processed['retrieved'],
                        acknowledged=processed['acknowledged'],
                        failed=processed['failed'])

        return batch_item_failures

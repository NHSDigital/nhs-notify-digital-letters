"""
Module for processing messages from a MESH mailbox
"""

from datetime import datetime, timezone
from uuid import uuid4

from event_publisher import EventPublisher

from .errors import AuthorizationError, format_exception

ACKNOWLEDGED_MESSAGE = "acknowledged message"
PROCESSING_MESSAGE = "processing message"


class MeshMessageProcessor:  # pylint: disable=too-many-instance-attributes
    """
    Class that processes messages from a MESH inbox
    """

    def __init__(self, **kwargs):
        self.__config = kwargs['config']
        self.__mesh_client = kwargs['mesh_client']
        self.__sender_lookup = kwargs['sender_lookup']
        self.__log = kwargs['log']
        self.__get_remaining_time_in_millis = kwargs['get_remaining_time_in_millis']
        self.__mesh_client.handshake()
        self.__polling_metric = kwargs['polling_metric']

        deployment = 'primary'
        plane = 'data-plane'
        self.__cloud_event_source = f'/nhs/england/notify/{self.__config.environment}/{deployment}/{plane}/digital-letters'

        # Initialize EventPublisher
        self.__event_publisher = EventPublisher(
            event_bus_arn=self.__config.event_bus_arn,
            dlq_url=self.__config.event_publisher_dlq_url,
            logger=self.__log
        )

    def is_enough_time_to_process_message(self):
        """
        Determines whether the lambda should continue to process messages
        """
        remaining_time_in_millis = self.__get_remaining_time_in_millis()

        return int(self.__config.maximum_runtime_milliseconds) \
            < remaining_time_in_millis

    def process_messages(self):
        """
        Iterates over and processes messages in a MESH inbox
        """
        is_message_iterator_empty = False

        while not is_message_iterator_empty:
            self.__log.info('Polling for messages')

            # if iterate_all_messages does not return any items, we will exit the loop
            is_message_iterator_empty = True

            # Initial processing of each message
            for message in self.__mesh_client.iterate_all_messages():
                is_message_iterator_empty = False
                if not self.is_enough_time_to_process_message():
                    self.__log.info(
                        'Not enough time to process more files. Exiting')
                    self.__polling_metric.record(1)
                    return

                self.process_message(message)

        self.__log.info('No new messages found. Exiting')
        self.__polling_metric.record(1)

    def process_message(self, message):
        """
        Processes an individual message from a MESH inbox - validates sender and publishes event
        """

        message_type = getattr(message, 'message_type', '')
        sender_mailbox_id = getattr(message, "sender", "")
        workflow_id = getattr(message, "workflow_id", "")
        subject = getattr(message, "subject", "")
        message_reference = getattr(message, "local_id", "")

        logger = self.__log.bind(
            message_id=message.id(),
            sender=sender_mailbox_id,
            workflow_id=workflow_id,
            subject=subject,
            local_id=message_reference,
            message_type=message_type,
        )

        logger.info(PROCESSING_MESSAGE)

        try:
            # Basic sender validation - only publish events for known senders
            if not self.__sender_lookup.is_valid_sender(sender_mailbox_id):
                raise AuthorizationError(
                    f'Cannot authorize sender with mailbox ID "{sender_mailbox_id}"')

            # Get the corresponding sender ID
            sender_id = self.__sender_lookup.get_sender_id(sender_mailbox_id)

            # Publish event for valid sender
            message_id = message.id()
            event_detail = {
                "data": {
                    "meshMessageId": message_id,
                    "senderId": sender_id,
                    "messageReference": message_reference
                }
            }

            self._publish_mesh_inbox_message_received_event(event_detail)
            logger.info(
                "published MESHInboxMessageReceived event for valid sender")

        except AuthorizationError as exception:
            logger.error(format_exception(exception))
            message.acknowledge()  # Remove from inbox - no notification to sender
            logger.info(ACKNOWLEDGED_MESSAGE)
            return

        except Exception as exc:  # pylint: disable=broad-except
            logger.error(format_exception(exc))

    def _publish_mesh_inbox_message_received_event(self, event_detail):
        """
        Publishes a MESHInboxMessageReceived event for the retriever component.
        """
        now = datetime.now(timezone.utc).isoformat()

        cloud_event = {
            'profileversion': '1.0.0',
            'profilepublished': '2025-10',
            'id': str(uuid4()),
            'specversion': '1.0',
            'source': self.__cloud_event_source,
            'subject': 'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000',
            'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1',
            'time': now,
            'recordedtime': now,
            'severitynumber': 2,
            'severitytext': 'INFO',
            'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letters-mesh-inbox-message-received-data.schema.json',
            'dataschemaversion': '1.0',
            'data': event_detail.get('data', {}),
        }

        failed_events = self.__event_publisher.send_events([cloud_event])

        if failed_events:
            error_msg = f"Failed to publish MESHInboxMessageReceived event: {failed_events}"
            self.__log.error(error_msg, failed_count=len(failed_events))
            raise RuntimeError(error_msg)

        self.__log.info("Published MESHInboxMessageReceived event",
                        mesh_message_id=event_detail["data"]["meshMessageId"],
                        sender_id=event_detail["data"]["senderId"])

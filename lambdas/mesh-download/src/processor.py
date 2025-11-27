"""
Module for processing MESH download requests from SQS
"""

import json
import os
from datetime import datetime, timezone
from uuid import uuid4

import boto3
from event_publisher import EventPublisher
from event_publisher.models import MeshInboxMessageEvent, MeshDownloadMessageEvent
from pydantic import ValidationError

from .errors import format_exception
from .document_store import DocumentStore


class MeshDownloadProcessor:
    """
    Class that processes MESH download requests from SQS messages
    """

    def __init__(self, **kwargs):
        self.__mesh_client = kwargs['mesh_client']
        self.__log = kwargs['log']

        # Allow s3_client to be injected for testing
        if 's3_client' in kwargs:
            self.__s3_client = kwargs['s3_client']
        else:
            self.__s3_client = boto3.client('s3')
        self.__mesh_client.handshake()

        environment = os.getenv('ENVIRONMENT', 'development')
        deployment = 'primary'
        plane = 'data-plane'
        self.__cloud_event_source = f'/nhs/england/notify/{environment}/{deployment}/{plane}/digitalletters/mesh'

        # Create config object for DocumentStore (mimicking mesh-poll pattern)
        class Config:
            """Configuration holder for S3 client and bucket"""
            def __init__(self, s3_client, bucket):
                self.s3_client = s3_client
                self.transactional_data_bucket = bucket

        pii_bucket = os.getenv('PII_BUCKET')
        if not pii_bucket:
            raise ValueError("PII_BUCKET environment variable not set")

        config = Config(self.__s3_client, pii_bucket)

        # Allow document_store to be injected for testing
        if 'document_store' in kwargs:
            self.__document_store = kwargs['document_store']
        else:
            self.__document_store = DocumentStore(config)

        # Allow event_publisher to be injected for testing
        if 'event_publisher' in kwargs:
            self.__event_publisher = kwargs['event_publisher']
        else:
            # Initialize EventPublisher
            event_bus_arn = os.getenv('EVENT_PUBLISHER_EVENT_BUS_ARN')
            dlq_url = os.getenv('EVENT_PUBLISHER_DLQ_URL', '')

            if event_bus_arn and dlq_url:
                self.__event_publisher = EventPublisher(
                    event_bus_arn=event_bus_arn,
                    dlq_url=dlq_url,
                    logger=self.__log
                )
            else:
                self.__event_publisher = None

    def process_sqs_message(self, sqs_record):
        """
        Processes an SQS message containing a MESHInboxMessageReceived event
        """
        try:
            message_body = json.loads(sqs_record['body'])

            event_detail = message_body.get('detail', {})

            # Validate with Pydantic
            try:
                validated_event = MeshInboxMessageEvent(**event_detail)
                self.__log.debug("CloudEvent validation passed")
            except ValidationError as validation_error:
                self.__log.error("CloudEvent validation failed - rejecting malformed event",
                                validation_errors=str(validation_error),
                                event_detail=event_detail)
                raise

            # Extract data payload
            data = validated_event.data
            mesh_message_id = data.meshMessageId
            sender_id = data.senderId

            if not mesh_message_id:
                self.__log.error("Missing meshMessageId in event data", sqs_record=sqs_record)
                return

            logger = self.__log.bind(mesh_message_id=mesh_message_id)
            logger.info("Processing MESH download request")

            # Download and store the MESH message
            self.download_and_store_message(mesh_message_id, sender_id, logger)

        except Exception as exc:
            self.__log.error("Error processing SQS message",
                            error=str(exc),
                            sqs_record=sqs_record)
            raise

    def download_and_store_message(self, mesh_message_id, sender_id, logger):
        """
        Downloads a MESH message and stores it in S3
        """
        try:
            # Get message from MESH
            message = self.__mesh_client.retrieve_message(mesh_message_id)

            if not message:
                logger.error("Message not found in MESH inbox")
                return

            # Extract data from MESH message headers
            sender_mailbox_id = getattr(message, 'sender', '')
            message_reference = getattr(message, 'local_id', '')
            message_type = getattr(message, 'message_type', '')
            subject = getattr(message, 'subject', '')
            workflow_id = getattr(message, 'workflow_id', '')

            logger = logger.bind(
                sender_id=sender_id,
                mesh_message_id=mesh_message_id,
                sender=sender_mailbox_id,
                workflow_id=workflow_id,
                subject=subject,
                local_id=message_reference,
                message_type=message_type
            )

            logger.info("Processing message based on type")

            # Process DATA message (document reference)
            self.process_data_message(message, sender_id, message_reference, logger)

        except Exception as exc:
            logger.error("Error downloading and storing MESH message", error=format_exception(exc))
            raise

    def process_data_message(self, message, sender_id, message_reference, logger):
        """
        Processes a DATA message (document reference) from MESH inbox
        """
        try:
            # Download message content
            message_content = message.read()

            logger.info("Downloaded MESH message content")

            # Store document in S3 PII bucket using DocumentStore
            s3_key = self.__document_store.store_document(
                sender_id=sender_id,
                message_reference=message_reference,
                content=message_content,
            )

            # Generate message URI
            pii_bucket = os.getenv('PII_BUCKET')
            message_uri = f"s3://{pii_bucket}/{s3_key}"

            logger.info("Stored MESH message in S3",
                        s3_bucket=pii_bucket,
                        s3_key=s3_key)

            event_detail = {
                "data": {
                    "senderId": sender_id,
                    'messageUri': message_uri,
                    'messageReference': message_reference,
                },
            }

            # Publish MESHInboxMessageDownloaded event
            self._publish_mesh_inbox_message_downloaded_event(
                event_detail
            )

            # Acknowledge the message to remove it from MESH inbox
            message.acknowledge()
            logger.info("Acknowledged message")

        except Exception as exc:
            logger.error("Error processing data message", error=format_exception(exc))
            raise

    def _publish_mesh_inbox_message_downloaded_event(self, event_detail):
        """
        Publishes a MESHInboxMessageDownloaded event after successful download
        """

        now = datetime.now(timezone.utc).isoformat()

        cloud_event = {
            'profileversion': '1.0.0',
            'profilepublished': '2025-10',
            'id': str(uuid4()),
            'specversion': '1.0',
            'source': self.__cloud_event_source,
            'subject': 'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000',
            'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
            'time': now,
            'recordedtime': now,
            'severitynumber': 2,
            'severitytext': 'INFO',
            'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
            'dataschemaversion': '1.0',
            'data': event_detail.get('data', {}),
        }

        # Validate against MeshDownloadMessageEvent schema before sending
        try:
            MeshDownloadMessageEvent(**cloud_event)
        except ValidationError as e:
            self.__log.error("Failed to construct valid MeshDownloadMessageEvent", error=str(e))
            raise

        failed_events = self.__event_publisher.send_events([cloud_event])

        if failed_events:
            error_msg = f"Failed to publish MESHInboxMessageDownloaded event: {failed_events}"
            self.__log.error(error_msg, failed_count=len(failed_events))
            raise RuntimeError(error_msg)
        else:
            self.__log.info("Published MESHInboxMessageDownloaded event",
                            sender_id=event_detail["data"]["senderId"],
                            message_uri=event_detail["data"]["messageUri"],
                            message_reference=event_detail["data"]["messageReference"])

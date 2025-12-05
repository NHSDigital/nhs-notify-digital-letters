import json
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError
from event_publisher.models import MeshInboxMessageEvent, MeshDownloadMessageEvent


class MeshDownloadProcessor:
    def __init__(self, **kwargs):
        self.__config = kwargs['config']
        self.__log = kwargs['log']
        self.__mesh_client = kwargs['mesh_client']
        self.__download_metric = kwargs['download_metric']
        self.__document_store = kwargs['document_store']
        self.__event_publisher = kwargs['event_publisher']

        self.__mesh_client.handshake()

        deployment = 'primary'
        plane = 'data-plane'
        self.__cloud_event_source = (
            f'/nhs/england/notify/{self.__config.environment}/'
            f'{deployment}/{plane}/digitalletters/mesh'
        )

        self.__storage_bucket = self.__config.transactional_data_bucket

    def process_sqs_message(self, sqs_record):
        try:
            validated_event = self._parse_and_validate_event(sqs_record)
            logger = self.__log.bind(mesh_message_id=validated_event.data.meshMessageId)

            logger.info("Processing MESH download request")
            self._handle_download(validated_event, logger)

        except Exception as exc:
            self.__log.error(
                "Error processing SQS message",
                error=str(exc),
                sqs_record=sqs_record
            )
            raise

    def _parse_and_validate_event(self, sqs_record):
        message_body = json.loads(sqs_record['body'])
        event_detail = message_body.get('detail', {})

        try:
            event = MeshInboxMessageEvent(**event_detail)
            self.__log.debug("CloudEvent validation passed")
            return event
        except ValidationError as e:
            self.__log.error(
                "CloudEvent validation failed",
                validation_errors=str(e),
                event_detail=event_detail
            )
            raise

    def _handle_download(self, event, logger):
        data = event.data

        message = self.__mesh_client.retrieve_message(data.meshMessageId)
        if not message:
            logger.error("Message not found in MESH inbox")
            return

        logger.info(
            "Retrieved MESH message",
            sender=getattr(message, 'sender', ''),
            local_id=getattr(message, 'local_id', ''),
            workflow_id=getattr(message, 'workflow_id', ''),
            subject=getattr(message, 'subject', ''),
            message_type=getattr(message, 'message_type', '')
        )

        content = message.read()
        logger.info("Downloaded MESH message content")

        uri = self._store_message_content(
            sender_id=data.senderId,
            message_reference=data.messageReference,
            message_content=content,
            logger=logger
        )

        self._publish_downloaded_event(
            sender_id=data.senderId,
            message_uri=uri,
            message_reference=data.messageReference
        )

        message.acknowledge()
        logger.info("Acknowledged message")

        self.__download_metric.record(1)

    def _store_message_content(self, sender_id, message_reference, message_content, logger):
        s3_key = self.__document_store.store_document(
            sender_id=sender_id,
            message_reference=message_reference,
            content=message_content,
        )

        message_uri = f"s3://{self.__storage_bucket}/{s3_key}"
        logger.info("Stored MESH message in S3",
                    s3_bucket=self.__storage_bucket,
                    s3_key=s3_key)

        return message_uri

    def _publish_downloaded_event(self, sender_id, message_uri, message_reference):
        event_detail = {
            "data": {
                "senderId": sender_id,
                "messageUri": message_uri,
                "messageReference": message_reference,
            }
        }

        cloud_event = self._build_download_event(event_detail)

        try:
            MeshDownloadMessageEvent(**cloud_event)
        except ValidationError as e:
            self.__log.error("Invalid MeshDownloadMessageEvent", error=str(e))
            raise

        failed = self.__event_publisher.send_events([cloud_event])
        if failed:
            msg = f"Failed to publish MESHInboxMessageDownloaded event: {failed}"
            self.__log.error(msg, failed_count=len(failed))
            raise RuntimeError(msg)

        self.__log.info(
            "Published MESHInboxMessageDownloaded event",
            sender_id=sender_id,
            message_uri=message_uri,
            message_reference=message_reference
        )

    def _build_download_event(self, event_detail):
        now = datetime.now(timezone.utc).isoformat()

        return {
            'profileversion': '1.0.0',
            'profilepublished': '2025-10',
            'id': str(uuid4()),
            'specversion': '1.0',
            'source': self.__cloud_event_source,
            'subject': (
                'customer/00000000-0000-0000-0000-000000000000/'
                'recipient/00000000-0000-0000-0000-000000000000'
            ),
            'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
            'time': now,
            'recordedtime': now,
            'severitynumber': 2,
            'severitytext': 'INFO',
            'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            'dataschema':
                'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/'
                'digital-letters-mesh-inbox-message-downloaded-data.schema.json',
            'dataschemaversion': '1.0',
            'data': event_detail.get('data', {}),
        }

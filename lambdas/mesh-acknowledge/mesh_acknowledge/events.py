"""Event parsing and publishing for MESH acknowledge lambda."""

import json
from datetime import datetime, timezone
from uuid import uuid4

from digital_letters_events import MESHInboxMessageAcknowledged, MESHInboxMessageDownloaded
from event_publisher import EventPublisher


def parse_downloaded_event(sqs_record, logger) -> MESHInboxMessageDownloaded:
    """
    Parses and validates a MESHInboxMessageDownloaded event from an SQS record.
    """
    try:
        message_body = json.loads(sqs_record['body'])
        event_detail = message_body.get('detail', {})

        try:
            return MESHInboxMessageDownloaded(**event_detail)

        except Exception as e:
            logger.error(
                "MESHInboxMessageDownloaded validation failed",
                validation_errors=str(e),
                event_detail=event_detail
            )
            raise ValueError(
                "Error processing MESHInboxMessageDownloaded event") from e
    except json.JSONDecodeError as e:
        logger.error(
            "Error parsing SQS record body as JSON",
            body=sqs_record.get('body', ''),
            error=str(e)
        )
        raise ValueError("Error parsing SQS record") from e


def publish_acknowledged_event(
        logger, event_publisher: EventPublisher, incoming_event: MESHInboxMessageDownloaded,
        mesh_mailbox_id: str):
    """
    Publishes a MESHInboxMessageAcknowledged event.
    """
    now = datetime.now(timezone.utc).isoformat()

    try:
        acknowledged_event = {
            **incoming_event.model_dump(),
            'id': str(uuid4()),
            'time': now,
            'recordedtime': now,
            'type': 'uk.nhs.notify.digital.letters.mesh.inbox.message.acknowledged.v1',
            'dataschema': (
                'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/'
                'digital-letters-mesh-inbox-message-acknowledged-data.schema.json'
            ),
            'data': {
                'messageReference': incoming_event.data.messageReference,
                'senderId': incoming_event.data.senderId,
                'meshMailboxId': mesh_mailbox_id,
            }
        }

        failed = event_publisher.send_events([acknowledged_event], MESHInboxMessageAcknowledged)

        if failed:
            msg = f"Failed to publish MESHInboxMessageAcknowledged event: {failed}"
            logger.error(msg, failed_count=len(failed))
            raise RuntimeError(msg)

        logger.info(
            "Published MESHInboxMessageAcknowledged event",
            sender_id=incoming_event.data.senderId,
            mesh_mailbox_id=mesh_mailbox_id,
            message_reference=incoming_event.data.messageReference
        )
    except Exception as e:
        logger.error(
            "Failed to publish MESHInboxMessageAcknowledged event", error=str(e))
        raise

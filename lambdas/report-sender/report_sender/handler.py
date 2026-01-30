"""lambda handler for send reports application"""

from boto3 import client
from dl_utils import log, EventPublisher
from .sender_lookup import SenderLookup
from .config import Config
from .report_sender_processor import ReportSenderProcessor
from .reports_store import ReportsStore
from .mesh_report_sender import MeshReportsSender


def handler(event, context):
    """
    Lambda handler for sending reports to Trusts via MESH.
    Process SQS events from the report-sender queue.
    Returns batch item failures for partial batch failure handling.
    """

    log.info("Received SQS event", record_count=len(event.get('Records', [])))
    batch_item_failures = []
    processed = {
        'retrieved': 0,
        'sent': 0,
        'failed': 0
    }

    try:
        with Config() as config:

            event_publisher = EventPublisher(
                event_bus_arn=config.event_publisher_event_bus_arn,
                dlq_url=config.event_publisher_dlq_url,
                logger=log
            )

            reports_store = ReportsStore(config.s3_client)

            mesh_report_sender = MeshReportsSender(config.mesh_client, log)

            processor = ReportSenderProcessor(
                config=config,
                log=log,
                sender_lookup=SenderLookup(client('ssm'), config),
                mesh_report_sender=mesh_report_sender,
                reports_store=reports_store,
                event_publisher=event_publisher,
                send_metric=config.send_metric)

            # Process each SQS record
            for record in event.get('Records', []):
                processed['retrieved'] += 1
                message_id = record.get('messageId')

                if record.get('eventSource') != 'aws:sqs':
                    log.warn("Skipping non-SQS record", message_id=message_id)
                    continue

                try:
                    processor.process_sqs_message(record)
                    processed['sent'] += 1

                except Exception as exc:
                    processed['failed'] += 1
                    log.error("Failed to process SQS message",
                            message_id=message_id,
                            error=str(exc))
                    batch_item_failures.append({"itemIdentifier": message_id})

        log.info("Processed SQS event",
                retrieved=processed['retrieved'],
                sent=processed['sent'],
                failed=processed['failed'])

        return {"batchItemFailures": batch_item_failures}
    except Exception as exc:
        log.exception("Failed to process send reports", error=str(exc))
        raise exc

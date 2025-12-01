"""lambda handler for mesh download"""

import json
from .config import Config, log
from .processor import MeshDownloadProcessor


def handler(event, context):
    """
    lambda handler for mesh download
    Processes SQS events from mesh-download queue
    Returns batch item failures for partial batch failure handling
    """

    log.info("Received SQS event", record_count=len(event.get('Records', [])))

    batch_item_failures = []
    processed = {
        'retrieved': 0,
        'downloaded': 0,
        'failed': 0
    }

    try:
        with Config() as config:
            processor = MeshDownloadProcessor(
                mesh_client=config.mesh_client,
                download_metric=config.download_metric,
                log=log
            )

            # Process each SQS record
            for record in event.get('Records', []):
                processed['retrieved'] += 1
                message_id = record.get('messageId')

                if record.get('eventSource') != 'aws:sqs':
                    log.warn("Skipping non-SQS record", message_id=message_id)
                    continue

                try:
                    processor.process_sqs_message(record)
                    processed['downloaded'] += 1

                except Exception as exc:
                    processed['failed'] += 1
                    log.error("Failed to process SQS message",
                            message_id=message_id,
                            error=str(exc))
                    batch_item_failures.append({"itemIdentifier": message_id})

        log.info("Processed SQS event",
                retrieved=processed['retrieved'],
                downloaded=processed['downloaded'],
                failed=processed['failed'])

        return {"batchItemFailures": batch_item_failures}

    except Exception as exc:
        log.error("Error in mesh download handler", error=str(exc))
        raise

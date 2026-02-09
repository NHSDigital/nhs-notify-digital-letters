"""Dead Letter Queue (DLQ) handler for sending failed records to SQS DLQ."""
from typing import Any
import json

from botocore.exceptions import ClientError

class Dlq:
    """
    Dead Letter Queue (DLQ) handler for sending failed records to SQS DLQ."""
    def __init__(
        self,
        sqs_client: Any,
        dlq_url: str,
        logger,
    ):
        self.sqs_client = sqs_client
        self.dlq_url = dlq_url
        self.logger = logger

    def send_to_queue(self, record: Any, reason: str) -> None:
        """
        Send a record to the DLQ.
        """
        try:
            response = self.sqs_client.send_message(
                QueueUrl=self.dlq_url,
                MessageBody=json.dumps(record),
                MessageAttributes={
                    'DlqReason': {
                        'DataType': 'String',
                        'StringValue': reason
                    }
                }
            )
            self.logger.info(
                "Sent message to DLQ",
                message_id=response.get('MessageId'),
                dlq_url=self.dlq_url,
            )
        except ClientError as error:
            self.logger.error(
                "Failed to send record to DLQ",
                error=str(error),
                dlq_url=self.dlq_url,
            )
            raise

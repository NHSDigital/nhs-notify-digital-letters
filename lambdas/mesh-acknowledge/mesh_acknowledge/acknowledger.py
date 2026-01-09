"""Module for acknowledging MESH messages."""

import json
from mesh_client import MeshClient

NOTIFY_ACK_WORKFLOW_ID = "NHS_NOTIFY_SEND_REQUEST_ACK"
ACK_SUBJECT = "202"


class MeshAcknowledger:
    """
    Class responsible for acknowledging MESH messages.
    """

    def __init__(self, mesh_client: MeshClient, logger):
        self.__log = logger
        self.__mesh_client = mesh_client

        self.__mesh_client.handshake()

    def acknowledge_message(self,
                            mailbox_id: str,
                            message_id: str,
                            message_reference: str,
                            sender_id: str
                            ) -> str:
        """
        Acknowledge a MESH message given its ID.

        Args:
            mailbox_id (str): The ID of the mailbox to send the acknowledgment to.
            message_id (str): The ID of the message to acknowledge.
            message_reference (str): The reference of the message to acknowledge.
            sender_id (str): ID of the original message's sender to acknowledge.

        Returns:
            str: The ID of the acknowledgment message sent.

        Raises:
            Exception: If the acknowledgment fails.
        """

        message_body = json.dumps({
            "meshMessageId": message_id,
            "requestId": f"{sender_id}_{message_reference}"
        }).encode()

        try:
            ack_message_id = self.__mesh_client.send_message(
                mailbox_id,
                message_body,
                workflow_id=NOTIFY_ACK_WORKFLOW_ID,
                local_id=message_reference,
                subject=ACK_SUBJECT
            )
            self.__log.info(
                "Acknowledged MESH message",
                mesh_mailbox_id=mailbox_id,
                mesh_message_id=message_id,
                mesh_message_reference=message_reference,
                ack_message_id=ack_message_id
            )

            return ack_message_id

        except Exception as e:
            self.__log.error(
                "Failed to acknowledge MESH message",
                mesh_mailbox_id=mailbox_id,
                mesh_message_id=message_id,
                mesh_message_reference=message_reference,
                error=str(e)
            )

            raise

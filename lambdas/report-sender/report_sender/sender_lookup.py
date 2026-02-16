import json
from .errors import InvalidSenderDetailsError


class SenderLookup:
    """
    Lightweight sender lookup for basic sender validation and sender ID extraction
    """

    def __init__(self, ssm, config):
        self.__ssm = ssm
        self.__config = config

    def get_mesh_mailbox_reports_id_from_sender(self, sender_id) -> str:
        """
        Get the MESH reporting mailbox for a given sender ID
        """

        sender_key = f"{self.__config.ssm_senders_prefix}/{sender_id}"

        sender = self.__ssm.get_parameter(Name=sender_key, WithDecryption=True)

        if not sender:
            raise InvalidSenderDetailsError(f"No sender found in SSM for sender ID {sender_id}")

        return self.__extract_mesh_mailbox_reports_id(sender, sender_id)

    def __extract_mesh_mailbox_reports_id(self, sender, sender_id) -> str:
        """
        Extract just the meshMailboxReportsId from a sender parameter
        """
        if "Value" not in sender['Parameter']:
            raise InvalidSenderDetailsError(f"The SSM value for the sender ID {sender_id} are missing a 'Value' field")

        try:
            sender_config = json.loads(sender['Parameter']['Value'])
            return sender_config.get("meshMailboxReportsId")
        except (ValueError, AttributeError):
            raise InvalidSenderDetailsError(f"Failed to parse meshMailboxReportsId from parameter for sender ID {sender_id}")

import json
from .errors import format_exception


class SenderLookup:
    """
    Lightweight sender lookup for basic sender validation and sender ID extraction
    """

    def __init__(self, ssm, config, logger):
        self.__ssm = ssm
        self.__config = config
        self.__logger = logger

    def get_mailbox_from_sender(self, sender_id) -> str:
        """
        Get the MESH reporting mailbox for a given sender ID
        """

        sender_key = f"{self.__config.ssm_senders_prefix}/{sender_id}"

        sender = self.__ssm.get_parameter(Name=sender_key, WithDecryption=True)

        if not sender:
            raise Exception(f"No sender found in SSM for sender ID {sender_id}")

        return self.__extract_mailbox_id(sender, sender_id)

    def __extract_mailbox_id(self, sender, sender_id) -> str:
        """
        Extract just the meshMailboxSenderId from a sender parameter
        """
        if "Value" not in sender['Parameter']:
            raise Exception(f"The SSM value for the sender ID {sender_id} are missing a 'Value' field")

        try:
            sender_config = json.loads(sender['Parameter']['Value'])
            return sender_config.get("meshMailboxSenderId")
        except (ValueError, AttributeError) as exception:
            raise Exception(f"Failed to parse mailbox ID from parameter for sender ID {sender_id}")

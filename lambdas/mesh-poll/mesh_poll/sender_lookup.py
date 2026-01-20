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
        self.__valid_senders = set()
        self.__mailbox_to_sender = {}
        self.load_valid_senders()

    def is_valid_sender(self, mailbox_id):
        """
        Check if a MESH mailbox ID is from a known sender
        """
        if not mailbox_id:
            return False

        return mailbox_id.upper() in self.__valid_senders

    def get_sender_id(self, mailbox_id):
        """
        Get the sender ID for a given MESH mailbox ID
        """
        if not mailbox_id:
            return None

        return self.__mailbox_to_sender.get(mailbox_id.upper())

    def load_valid_senders(self):
        """
        Loads mailbox IDs and their corresponding sender IDs into memory
        """
        mailbox_ids = set()
        mailbox_to_sender = {}
        next_token = ""
        page_number = 0

        while next_token or page_number < 1:
            (page_mailbox_ids, page_mapping, token) = self.__get_page(next_token)
            mailbox_ids.update(page_mailbox_ids)
            mailbox_to_sender.update(page_mapping)
            next_token = token
            page_number += 1

        self.__valid_senders = mailbox_ids
        self.__mailbox_to_sender = mailbox_to_sender
        self.__logger.debug(
            f"Loaded {len(self.__valid_senders)} valid sender mailbox IDs")

    def __get_page(self, next_token=""):
        """
        Loads a page of sender data and extracts mailbox IDs and sender IDs
        """
        senders_path = f"{self.__config.ssm_senders_prefix.rstrip('/')}/"

        if len(next_token) == 0:
            response = self.__ssm.get_parameters_by_path(
                Path=senders_path,
                WithDecryption=True,
            )
        else:
            response = self.__ssm.get_parameters_by_path(
                Path=senders_path,
                WithDecryption=True,
                NextToken=next_token,
            )

        mailbox_ids = set()
        mailbox_to_sender = {}

        if "Parameters" in response:
            for parameter in response["Parameters"]:
                mailbox_id = self.__extract_mailbox_id(parameter)
                sender_id = self.__extract_sender_id(parameter)
                if mailbox_id and sender_id:
                    mailbox_id_upper = mailbox_id.upper()
                    mailbox_ids.add(mailbox_id_upper)
                    mailbox_to_sender[mailbox_id_upper] = sender_id

        new_next_token = response.get("NextToken", "")
        return (mailbox_ids, mailbox_to_sender, new_next_token)

    def __extract_mailbox_id(self, parameter):
        """
        Extract just the meshMailboxSenderId from a sender parameter
        """
        if "Value" not in parameter:
            return None

        try:
            sender_config = json.loads(parameter["Value"])
            return sender_config.get("meshMailboxSenderId", "")
        except (ValueError, AttributeError) as exception:
            self.__logger.warn(
                f"Failed to parse mailbox ID from parameter {parameter['Name']}")
            self.__logger.error(format_exception(exception))
            return None

    def __extract_sender_id(self, parameter):
        """
        Extract just the sender ID from a sender parameter
        """
        if "Value" not in parameter:
            return None

        try:
            sender_config = json.loads(parameter["Value"])
            return sender_config.get("senderId", "")
        except (ValueError, AttributeError) as exception:
            self.__logger.warn(
                f"Failed to parse sender ID from parameter {parameter['Name']}")
            self.__logger.error(format_exception(exception))
            return None

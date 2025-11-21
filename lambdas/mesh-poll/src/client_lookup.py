import json
from .errors import format_exception


class ClientLookup:
    """
    Lightweight client lookup for basic sender validation
    """

    def __init__(self, ssm, config, logger):
        self.__ssm = ssm
        self.__config = config
        self.__logger = logger
        self.__valid_senders = set()
        self.load_valid_senders()

    def is_valid_sender(self, mailbox_id):
        """
        Check if a MESH mailbox ID is from a known client
        """
        if not mailbox_id:
            return False

        return mailbox_id.upper() in self.__valid_senders

    def load_valid_senders(self):
        """
        Loads just the mailbox IDs of valid senders into memory
        """
        mailbox_ids = set()
        next_token = ""
        page_number = 0

        while next_token or page_number < 1:
            (page, token) = self.__get_page(next_token)
            mailbox_ids.update(page)
            next_token = token
            page_number += 1

        self.__valid_senders = mailbox_ids
        self.__logger.debug(
            f"Loaded {len(self.__valid_senders)} valid sender mailbox IDs")

    def __get_page(self, next_token=""):
        """
        Loads a page of client data and extracts just mailbox IDs
        """
        if len(next_token) == 0:
            response = self.__ssm.get_parameters_by_path(
                Path=f"{self.__config.ssm_clients_parameter_path.rstrip('/')}/",
                WithDecryption=True,
            )
        else:
            response = self.__ssm.get_parameters_by_path(
                Path=f"{self.__config.ssm_clients_parameter_path.rstrip('/')}/",
                WithDecryption=True,
                NextToken=next_token,
            )

        mailbox_ids = set()

        if "Parameters" in response:
            for parameter in response["Parameters"]:
                mailbox_id = self.__extract_mailbox_id(parameter)
                if mailbox_id:
                    mailbox_ids.add(mailbox_id.upper())

        new_next_token = response.get("NextToken", "")
        return (mailbox_ids, new_next_token)

    def __extract_mailbox_id(self, parameter):
        """
        Extract just the meshMailboxSenderId from a client parameter
        """
        if "Value" not in parameter:
            return None

        try:
            client_config = json.loads(parameter["Value"])
            return client_config.get("meshMailboxSenderId", "")
        except (ValueError, AttributeError) as exception:
            self.__logger.warn(
                f"Failed to parse mailbox ID from parameter {parameter['Name']}")
            self.__logger.error(format_exception(exception))
            return None

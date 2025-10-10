import json
from .errors import AuthorizationError, AuthenticationError, format_exception
from .csv_streamer import UnrecognisedFieldError, MissingFieldError


class MeshMessageProcessorResponse:
    """
    Class representing the response to a processed MESH message
    """

    def __init__(self, client, message, response):
        self.__client = client
        self.__message = message
        self.__response = response

    def recipient(self):
        """
        Returns the mailbox id to send the response to
        """
        # Assumption from auth:
        # - Client exists and has a mesh mailbox id matching the incoming message
        return self.__client["meshMailboxId"]

    def subject(self):
        """
        Returns the status code to include in the response subject
        """

        if isinstance(self.__response, (UnrecognisedFieldError, MissingFieldError)):
            return "400"

        return "500"

    def data(self):
        """
        Returns the response data to write back to MESH as bytes
        """

        response = {
            "meshMessageId": self.__message.id()
        }

        message = self.__error_message()

        if message is not None:
            response["message"] = message

        return json.dumps(response).encode('utf-8')

    def workflow_id(self):
        """
        Computes the correct workflow ID for a response
        By default this will be "<prefix>_<suffix>", e.g. "RECEIVE_COMMS_GPREG"
        However some clients want to override this with a specific workflow ID
        which is taken from the config.
        """

        # Assumptions (from auth/message validation):
        # - client exists and has a workflowIdSuffix which matches the inbound message

        mesh_workflowid_receive_request_ack = self.__client['meshWorkflowIdReceiveRequestAck']
        mesh_workflowid = self.__client['meshResponseWorkflowId']

        if mesh_workflowid_receive_request_ack:
            return mesh_workflowid_receive_request_ack.upper()

        return mesh_workflowid.upper()

    def local_id(self):
        """
        Returns the local_id to include in the response
        """

        return getattr(self.__message, "local_id", "")

    def __error_message(self):
        """
        Returns the error message from the message processing if present
        """

        if isinstance(self.__response, Exception):
            return f"{type(self.__response).__name__}: {self.__response}"

        return None

"""
Module for mock MESH messages
"""


_ALLOWED_HEADERS = [
    'local_id',
    'message_id',
    'message_type',
    'partner_id',
    'recipient',
    'recipient_smtp',
    'sender',
    'sender_smtp',
    'subject',
    'version',
    'workflow_id'
]


class InvalidHeaderException(BaseException):
    """
    Indicates an invalid header on a MESH message
    """


class MockMeshMessage():  # pylint: disable=too-many-instance-attributes
    """
    Represents an S3-backed MESH Message
    """

    def __init__(self, s3_client, s3_bucket, s3_object, log):
        self.subject = None
        self.sender = None
        self.local_id = None
        self.__log = log
        self.headers = {}

        s3_response = s3_client.get_object(
            Bucket=s3_bucket,
            Key=s3_object['Key'],
            IfMatch=s3_object['ETag']
        )

        self.__log.info(f"Read S3 object {s3_object['Key']}")

        for header_key, header_value in s3_response['Metadata'].items():
            self.__log.info(
                f"Read header key {header_key}, value {header_value}")

            self.headers[header_key] = header_value

            if header_key not in _ALLOWED_HEADERS:
                raise InvalidHeaderException(header_key, header_value)

            setattr(self, header_key, header_value)

        self.full_body = s3_response['Body']

        self._msg_id = s3_object['Key'].rsplit('/', 2)[-1]
        self._s3_client = s3_client
        self._s3_bucket = s3_bucket
        self._s3_key = s3_object['Key']

    def read(self, byte_count=None):
        """
        Reads bytes from the message
        """
        return self.full_body.read(byte_count)

    def id(self):  # pylint: disable=invalid-name
        """
        Returns the message id
        """

        return self._msg_id

    def mex_headers(self):
        """
        returns a generator iteritems for all the headers
        """
        return self.headers.items()

    def __repr__(self):
        return (
            f"MockMeshMessage<id:{self.id()},"
            f"sender:{self.sender},"
            f"subject:{self.subject},"
            f"position:{self.full_body.tell()}>"
        )

    def acknowledge(self):
        """
        Acknowledge the message and delete it from the inbox
        """

        self._s3_client.delete_object(
            Bucket=self._s3_bucket,
            Key=self._s3_key
        )

    def __iter__(self):
        return self.full_body.iter_lines()

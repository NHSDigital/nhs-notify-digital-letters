
class MeshMessageProcessor:  # pylint: disable=too-many-instance-attributes
    """
    Class that processes messages from a MESH inbox
    """

    def __init__(self, **kwargs):
        self.__config = kwargs['config']
        self.__sqs_client = kwargs['sqs_client']
        self.__report_client = kwargs['report_client']
        self.__csv_streamer = kwargs['csv_streamer']
        self.__mesh_client = kwargs['mesh_client']
        self.__auth = kwargs['auth']
        self.__log = kwargs['log']
        self.__get_remaining_time_in_millis = kwargs['get_remaining_time_in_millis']
        self.__mesh_client.handshake()
        self.__polling_metric = kwargs['polling_metric']
        self.process_message_callback = self.process_message

    def is_enough_time_to_process_message(self):
        """
        Determines whether the lambda should continue to process messages
        """
        remaining_time_in_millis = self.__get_remaining_time_in_millis()

        return int(self.__config.maximum_runtime_milliseconds) \
            < remaining_time_in_millis

    def process_messages(self):
        """
        Iterates over and processes messages in a MESH inbox
        """
        is_message_iterator_empty = False

        while not is_message_iterator_empty:
            self.__log.info('Polling for messages')

            # if iterate_all_messages does not return any items, we will exit the loop
            is_message_iterator_empty = True

            # Initial processing of each message
            for message in self.__mesh_client.iterate_all_messages():
                is_message_iterator_empty = False
                if not self.is_enough_time_to_process_message():
                    self.__log.info(
                        'Not enough time to process more files. Exiting')
                    self.__polling_metric.record(1)
                    return

                self.process_message_callback(message)

        self.__log.info('No new messages found. Exiting')
        self.__polling_metric.record(1)

    def process_message(self, message):
        """
        Processes an individual message from a MESH inbox
        """

        message_type = getattr(message, 'message_type', '')

        logger = self.__log.bind(
            message_id=message.id(),
            sender=getattr(message, "sender", ""),
            workflow_id=getattr(message, "workflow_id", ""),
            subject=getattr(message, "subject", ""),
            local_id=getattr(message, "local_id", ""),
            message_type=message_type,
        )

        logger.info("processing message")

        if message_type == 'REPORT':
            return self.process_report_message(message, logger)

        return self.process_data_message(message, logger)

    def process_report_message(self, message, logger):
        """
        Processes an REPORT message from a MESH inbox
        """
        try:
            logger.info("processing report message")
            message_headers = '\n'.join([':'.join(item)
                                        for item in message.mex_headers()])

            self.__report_client.store_report(message_headers)
            logger.info("stored report message")

            message.acknowledge()
            logger.info("acknowledged message")

        except (Exception) as exception:  # pylint: disable=broad-exception-caught
            logger.error(format_exception(exception))

    def process_data_message(self, message, logger):
        """
        Processes an individual DATA message from a MESH inbox
        """

        try:
            client = self.__auth.validate_message(message)
            client_id = client["clientId"]
            allow_anonymous_patient = client["allowAnonymousPatient"]
            logger = logger.bind(client_id=client_id)
            logger.info("authorized message")

        except (AuthenticationError, AuthorizationError) as exception:
            # Do not process or respond to unauthorized messages
            logger.error(format_exception(exception))
            message.acknowledge()
            logger.info("acknowledged message")
            return None

        try:
            logger.info("parsing csv data")

            store_reference = self.__csv_streamer.stream_csv(
                message,
                client_id,
                allow_anonymous_patient
            )

            messsage_id = message.id()

            logger.info(
                f"unverified request store (S3): {store_reference}, ID: {messsage_id}")

            try:
                self.__sqs_client.send_message(
                    store_reference=store_reference,
                    client=client,
                    message=message,
                )
            except (Exception) as exception:
                # rethrow
                raise exception

            logger.info("sent message to sqs queue for processing")

            try:
                message.acknowledge()
                logger.info("acknowledged message")
            except (Exception) as exception:  # pylint: disable=broad-exception-caught
                logger.error(format_exception(exception))

        except (Exception) as exception:  # pylint: disable=broad-exception-caught

            logger.error(format_exception(exception))

            response = MeshMessageProcessorResponse(client, message, exception)

            try:
                self.respond(response)
                logger.info("sent error response to mesh")

                message.acknowledge()
                logger.info("acknowledged message")
            except (Exception) as response_exception:  # pylint: disable=broad-exception-caught
                logger.error(format_exception(response_exception))

        return None

    def respond(self, response):
        """
        Sends a response to MESH
        """

        local_id = response.local_id()
        workflow_id = response.workflow_id()
        response_subject = response.subject()
        recipient = response.recipient()

        logger = self.__log.bind(
            recipient=recipient,
            workflow_id=workflow_id,
            subject=response_subject,
            local_id=local_id,
            message_type="response",
        )

        response_data = response.data()

        logger.info(f"about to send response {response_data}")

        self.__mesh_client.send_message(
            recipient=recipient,
            data=response_data,
            subject=response_subject,
            local_id=local_id,
            workflow_id=workflow_id
        )
        logger.info("sent response")

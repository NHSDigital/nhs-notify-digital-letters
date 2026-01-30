"""
Module for processing messages from a MESH mailbox
"""

from datetime import datetime, timezone
import json
from uuid import uuid4

from dl_utils import EventPublisher
from pydantic import ValidationError
from digital_letters_events import ReportGenerated

from .errors import AuthorizationError, InvalidSenderDetailsError

ACKNOWLEDGED_MESSAGE = "acknowledged message"
PROCESSING_MESSAGE = "processing message"

class SendReportsProcessor:  # pylint: disable=too-many-instance-attributes
    """
    Class that processes messages from a MESH inbox
    """

    def __init__(self, **kwargs):
        self.__config = kwargs['config']
        self.__log = kwargs['log']
        self.__mesh_client = kwargs['mesh_client']
        self.__sender_lookup = kwargs['sender_lookup']
        self.__report_store = kwargs['report_store']
        self.__event_publisher = kwargs['event_publisher']
        self.__send_metric = kwargs['send_metric']
        self.__mesh_client.handshake()

        environment = 'development'
        deployment = 'primary'
        plane = 'data-plane'
        self.__cloud_event_source = f'/nhs/england/notify/{environment}/{deployment}/{plane}/digitalletters/mesh'

        # Initialize EventPublisher
        self.__event_publisher = EventPublisher(
            event_bus_arn=self.__config.event_bus_arn,
            dlq_url=self.__config.event_publisher_dlq_url,
            logger=self.__log
        )

    def _parse_and_validate_event(self, sqs_record):
        """Extract report generated data from SQS record"""
        message_body = json.loads(sqs_record['body'])
        event_detail = message_body.get('detail', {})

        try:
            validated_event = ReportGenerated(**event_detail)
            self.__log.debug("CloudEvent validation passed")
            return validated_event
        except ValidationError as e:
            self.__log.error(
                "CloudEvent validation failed",
                validation_errors=str(e),
                event_detail=event_detail
            )
            raise

    def _get_reporting_mailbox_for_sender(self, sender_id):
        """Fetch the reporting mailbox details for a given sender ID"""
        sender_details = self.__sender_lookup.get_sender_details(sender_id)
        if not sender_details:
            error_msg = f"Sender details not found for sender ID: {sender_id}"
            self.__log.error(error_msg)
            raise InvalidSenderDetailsError(error_msg)

        reporting_mailbox = sender_details.get('reporting_mailbox')
        if not reporting_mailbox:
            error_msg = f"Reporting mailbox not configured for sender ID: {sender_id}"
            self.__log.error(error_msg)
            raise InvalidSenderDetailsError(error_msg)

        return reporting_mailbox

    def _extract_report_date_from_report_uri(self, report_uri):
        ignore_extension_characters = 4 # to skip .csv
        report_date_start_index = 14 # to extract 2026-02-03.csv
        return report_uri[-(report_date_start_index):-ignore_extension_characters]


    def process_sqs_message(self, sqs_record):
        """
        Iterates over and processes messages in a MESH inbox
        """
        self.__log.info('Extract data from SQS record')

        report_generated_event = self._parse_and_validate_event(sqs_record)
        sender_id = report_generated_event.data.senderId
        report_uri = report_generated_event.data.reportUri

        self.__log.info(f'Fetching sender details for sender ID: {sender_id}')
        reporting_mailbox = self._get_reporting_mailbox_for_sender(sender_id)

        self.__log.info(f'Fetching reporting URI : {report_uri} for sender ID: {sender_id}')
        report_bytes = self.__report_store.download_report(report_uri)
        report_date = self._extract_report_date_from_report_uri(report_uri)

        self.__log.info(f'Sending MESH message to the sender: {sender_id} using mailbox: {reporting_mailbox} for date: {report_date}')
        # https://github.com/NHSDigital/mesh-client/blob/develop/tests/mesh_sandbox_tests.py
        self.__mesh_client.send_message(
            reporting_mailbox,
            report_bytes,
            workflow_id='NHS_NOTIFY_DIGITAL_LETTERS_DAILY_REPORT',
            subject=f'{report_date}'
        )

        self.__log.info(f'Publishing ReportEventSent for the sender: {sender_id} using mailbox: {reporting_mailbox} for date: {report_date}')
        # logger = self.__log.bind(mesh_message_id=validated_event.data.meshMessageId)

    def _publish_report_sent_event(self, sender_id, meshMailboxReportsId, event_detail):
        """
        Publishes a ReportSent event
        """
        now = datetime.now(timezone.utc).isoformat()

        cloud_event = {
            'id': str(uuid4()),
            'specversion': '1.0',
            'source': self.__cloud_event_source,
            'subject': f'customer/{sender_id}',
            'type': 'uk.nhs.notify.digital.letters.reporting.report.sent.v1',
            'time': now,
            'recordedtime': now,
            'severitynumber': 2,
            'severitytext': 'INFO',
            'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', # Note: covered by CCM-14255
            'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-reporting-report-sent-data.schema.json',
            'data': {
                "senderId": sender_id,
                "meshMailboxReportsId": meshMailboxReportsId,
            },
        }

        failed_events = self.__event_publisher.send_events([cloud_event])

        if failed_events:
            error_msg = f"Failed to publish ReportingReportSent event: {failed_events}"
            self.__log.error(error_msg, failed_count=len(failed_events))
            raise RuntimeError(error_msg)

"""
Module for parsing certificate expiry and reporting metric
"""
from datetime import datetime
import OpenSSL
import OpenSSL.crypto
from .metric_client import Metric


def report_expiry_time(client_cert, metric_name, metric_namespace, environment):
    """
        Report the days till expiry date for the given certificate
    """
    certificate_metric = CertificateExpiryMonitor(
        client_cert=client_cert,
        metric_client=Metric(name=metric_name,
                            namespace=metric_namespace,
                            dimensions={"Environment": environment}))

    certificate_metric.report_expiry_time()


class CertificateExpiryMonitor:  # pylint: disable=too-few-public-methods
    """Class for storing report metrics in Cloudwatch"""

    def __init__(self, **kwargs):
        self.client_cert = kwargs['client_cert']
        self.metric_client = kwargs['metric_client']

    def get_expiry_date(self):
        """
        Gets the expiry date from the certificate
        """
        with open(self.client_cert, encoding="utf-8") as cerf_file:
            cert = OpenSSL.crypto.load_certificate(
                OpenSSL.crypto.FILETYPE_PEM, cerf_file.read())
            not_after = cert.get_notAfter()
            timestamp = not_after.decode('utf-8')
            return datetime.strptime(timestamp, '%Y%m%d%H%M%S%z').date()

    def days_to_date(self, date):
        """
        Calculates number of days till date
        """
        now = datetime.now().date()
        return (date - now).days

    def report_expiry_time(self):
        """
        Reads the certificate and report metric with days until expiry of certificate.
        """
        expiry_date = self.get_expiry_date()
        days_left = self.days_to_date(expiry_date)
        self.metric_client.record(days_left)

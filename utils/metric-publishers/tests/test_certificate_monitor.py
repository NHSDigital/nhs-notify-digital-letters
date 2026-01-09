from unittest.mock import Mock, patch
from metric_publishers.certificate_monitor import CertificateExpiryMonitor, report_expiry_time
from metric_publishers.metric_client import Metric
import OpenSSL
import OpenSSL.crypto
import tempfile
import pytest
import os
import json


def create_certificate(not_after):
    cert = OpenSSL.crypto.X509()
    k = OpenSSL.crypto.PKey()
    k.generate_key(OpenSSL.crypto.TYPE_RSA, 4096)
    cert.get_subject().C = "UK"
    cert.get_subject().ST = "stateOrProvinceName"
    cert.get_subject().L = "localityName"
    cert.get_subject().O = "stateOrProvinceName"
    cert.get_subject().OU = "organizationUnitName"
    cert.get_subject().CN = "commonName"
    cert.get_subject().emailAddress = "emailAddress"
    cert.set_serial_number(0)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(not_after)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha512')

    return OpenSSL.crypto.dump_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)


def days_to_seconds(days):
    return 60*60*24 * days


def test_certificate_monitor_valid_cert():
    cert_bytes = create_certificate(days_to_seconds(10))
    with tempfile.NamedTemporaryFile(delete=False) as file:
        file.write(cert_bytes)
        file.close()
        certificate_monitor_valid_cert_test(file.name)
        os.unlink(file.name)


def certificate_monitor_valid_cert_test(cert_filename):
    metric_client = Mock(spec=Metric)

    monitor = CertificateExpiryMonitor(
        client_cert=cert_filename, metric_client=metric_client)
    monitor.report_expiry_time()

    metric_client.record.assert_called_once_with(10)


def test_certificate_monitor_invalid_cert():
    cert_bytes = bytes("jkh", encoding="utf-8")
    with tempfile.NamedTemporaryFile(delete=False) as file:
        file.write(cert_bytes)
        file.close()
        certificate_monitor_invalid_cert_test(file.name)
        os.unlink(file.name)


def certificate_monitor_invalid_cert_test(cert_filename):
    metric_client = Mock(spec=Metric)

    monitor = CertificateExpiryMonitor(
        client_cert=cert_filename, metric_client=metric_client)
    with pytest.raises(OpenSSL.crypto.Error):
        monitor.report_expiry_time()

    metric_client.record.assert_not_called()


@patch('builtins.print')
@patch('time.time', Mock(return_value=1234567890))
def test_report_expiry_time_valid_cert(mock_print):
    cert_bytes = create_certificate(days_to_seconds(10))
    with tempfile.NamedTemporaryFile(delete=False) as file:
        file.write(cert_bytes)
        file.close()
        report_expiry_time(file.name,
                            'Test_alarm_2', 'test_alarm_namespace_2', 'de-test2')

        mock_print.assert_called_once()

        arg = mock_print.call_args[0][0]

        assert json.loads(arg) == {
            "_aws": {
                "Timestamp": 1234567890000,
                "CloudWatchMetrics": [{
                    "Namespace": "test_alarm_namespace_2",
                    "Dimensions": [
                        ["Environment"]
                    ],
                    "Metrics": [
                        {
                            "Name": "Test_alarm_2",
                            "Unit": "Count",
                        }
                    ]
                }],
            },
            "Environment": "de-test2",
            "Test_alarm_2": 10,
        }

        os.unlink(file.name)

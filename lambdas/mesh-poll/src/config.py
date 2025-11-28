"""
Module for configuring Mesh Poll application
"""
import json
import os
import tempfile
import boto3
import structlog
import mesh_client
from py_mock_mesh.mesh_client import MockMeshClient
from metric_publishers.certificate_monitor import report_expiry_time
from metric_publishers.metric_client import Metric

from .errors import InvalidMeshEndpointError, InvalidEnvironmentVariableError

structlog.configure(processors=[structlog.processors.JSONRenderer()])
log = structlog.get_logger()


def store_file(content):
    """
    Writes a temp file and returns the name
    """

    with tempfile.NamedTemporaryFile(delete=False) as file:
        file.write(content)
        file.close()
        return file.name


_REQUIRED_ENV_VAR_MAP = {
    "ssm_prefix": "SSM_PREFIX",
    "ssm_senders_parameter_path": "SSM_SENDERS_PARAMETER_PATH",
    "maximum_runtime_milliseconds": "MAXIMUM_RUNTIME_MILLISECONDS",
    "environment": "ENVIRONMENT",
    "event_bus_arn": "EVENT_PUBLISHER_EVENT_BUS_ARN",
    "certificate_expiry_metric_name": "CERTIFICATE_EXPIRY_METRIC_NAME",
    "certificate_expiry_metric_namespace": "CERTIFICATE_EXPIRY_METRIC_NAMESPACE",
    "polling_metric_name": "POLLING_METRIC_NAME",
    "polling_metric_namespace": "POLLING_METRIC_NAMESPACE"
}

_OPTIONAL_ENV_VAR_MAP = {
    "use_mesh_mock": "USE_MESH_MOCK"
}


class Config:  # pylint: disable=too-many-instance-attributes

    """
    Represents the configuration of the Mesh Poll application
    """

    def __init__(self,
                ssm=None):

        self.ssm = ssm if ssm is not None else boto3.client('ssm')
        self.mesh_endpoint = None
        self.mesh_mailbox = None
        self.mesh_mailbox_password = None
        self.mesh_shared_key = None
        self.client_cert = None
        self.client_key = None
        self.mesh_client = None
        self.ssm_prefix = None
        self.ssm_senders_parameter_path = None
        self.environment = None
        self.event_bus_arn = None
        self.certificate_expiry_metric_name = None
        self.certificate_expiry_metric_namespace = None
        self.polling_metric_name = None
        self.polling_metric_namespace = None
        self.polling_metric = None
        self.use_mesh_mock = False

        missing_env_vars = []
        for attr, key in _REQUIRED_ENV_VAR_MAP.items():
            if key not in os.environ:
                missing_env_vars.append(f'"{key}"')
            else:
                setattr(self, attr, os.environ[key])

        # Handle optional environment variables
        for attr, key in _OPTIONAL_ENV_VAR_MAP.items():
            if key in os.environ:
                value = os.environ[key]
                if attr == "use_mesh_mock":
                    # Convert string to boolean
                    setattr(self, attr, value.lower()
                            in ('true', '1', 'yes', 'on'))
                else:
                    setattr(self, attr, value)

        if len(missing_env_vars) > 0:
            raise InvalidEnvironmentVariableError(
                f"Required environment variables {', '.join(missing_env_vars)} not set.")

    def __enter__(self):
        ssm_response = self.ssm.get_parameter(
            Name=self.ssm_prefix + '/config',
            WithDecryption=True
        )
        mesh_config = json.loads(
            ssm_response['Parameter']['Value']
        )

        self.mesh_endpoint = mesh_config['mesh_endpoint']
        self.mesh_mailbox = mesh_config['mesh_mailbox']
        self.mesh_mailbox_password = mesh_config['mesh_mailbox_password']
        self.mesh_shared_key = mesh_config['mesh_shared_key'].encode('ascii')

        # Build Mesh Client

        client_cert_parameter = self.ssm.get_parameter(
            Name=self.ssm_prefix + '/client-cert',
            WithDecryption=True
        )
        client_key_parameter = self.ssm.get_parameter(
            Name=self.ssm_prefix + '/client-key',
            WithDecryption=True
        )

        self.client_cert = store_file(
            client_cert_parameter['Parameter']['Value'].encode('utf-8')
        )
        self.client_key = store_file(
            client_key_parameter['Parameter']['Value'].encode('utf-8')
        )

        self.mesh_client = self.build_mesh_client()

        # Build Polling Metric
        self.polling_metric = self.build_polling_metric()

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        log.info('Cleaning up temporary files')
        os.unlink(self.client_cert)
        os.unlink(self.client_key)
        self.mesh_client.close()

    def lookup_endpoint(self, endpoint_identifier):
        """
        Looks up a MESH endpoint URL
        """

        variable_name = f"{endpoint_identifier}_ENDPOINT"

        if hasattr(mesh_client, variable_name):
            return getattr(mesh_client, variable_name)

        raise InvalidMeshEndpointError(
            f"mesh_client module has no such endpoint {variable_name}")

    def build_mesh_client(self):
        """
        Returns a MESH client based on the USE_MESH_MOCK environment variable
        """
        if self.use_mesh_mock:
            mock_bucket = os.getenv("MOCK_MESH_BUCKET")
            mock_endpoint = f"s3://{mock_bucket}/mock-mesh/"
            return MockMeshClient(
                boto3.client('s3'),
                mock_endpoint,
                self.mesh_mailbox,
                log
            )

        # Use real MESH client
        report_expiry_time(
            self.client_cert,
            self.certificate_expiry_metric_name,
            self.certificate_expiry_metric_namespace,
            self.environment)

        return mesh_client.MeshClient(
            self.lookup_endpoint(self.mesh_endpoint),
            self.mesh_mailbox,
            self.mesh_mailbox_password,
            self.mesh_shared_key,
            transparent_compress=True,
            cert=(self.client_cert, self.client_key)
        )

    def build_polling_metric(self):
        """
            Returns a custom metric to record messages processed during a successful polling
        """
        return Metric(name=self.polling_metric_name,
                        namespace=self.polling_metric_namespace,
                        dimensions={"Environment": self.environment})

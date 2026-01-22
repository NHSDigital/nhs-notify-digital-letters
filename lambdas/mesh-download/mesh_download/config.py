"""
Module for configuring MESH Download application
"""
from dl_utils import BaseMeshConfig, log
from metric_publishers.metric_client import Metric


_REQUIRED_ENV_VAR_MAP = {
    "ssm_prefix": "SSM_PREFIX",
    "environment": "ENVIRONMENT",
    "certificate_expiry_metric_name": "CERTIFICATE_EXPIRY_METRIC_NAME",
    "certificate_expiry_metric_namespace": "CERTIFICATE_EXPIRY_METRIC_NAMESPACE",
    "download_metric_name": "DOWNLOAD_METRIC_NAME",
    "download_metric_namespace": "DOWNLOAD_METRIC_NAMESPACE",
    "event_publisher_event_bus_arn": "EVENT_PUBLISHER_EVENT_BUS_ARN",
    "event_publisher_dlq_url": "EVENT_PUBLISHER_DLQ_URL",
    "pii_bucket": "PII_BUCKET"
}


class Config(BaseMeshConfig):
    """
    Represents the configuration of the MESH Download application.
    Inherits common MESH configuration from BaseMeshConfig.
    """

    _REQUIRED_ENV_VAR_MAP = _REQUIRED_ENV_VAR_MAP

    def __init__(self, ssm=None, s3_client=None):
        super().__init__(ssm=ssm, s3_client=s3_client)

        self.download_metric = None

    def __enter__(self):
        super().__enter__()

        # Build download metric
        self.download_metric = self.build_download_metric()

        return self

    def build_download_metric(self):
        """
        Returns a custom metric to record messages successfully downloaded and processed
        """
        return Metric(
            name=self.download_metric_name,
            namespace=self.download_metric_namespace,
            dimensions={"Environment": self.environment}
        )

    @property
    def transactional_data_bucket(self):
        """
        Returns the S3 bucket for storing downloaded messages.
        """
        return self.pii_bucket

"""
Module for configuring MESH Acknowledger application
"""
from event_publisher import BaseMeshConfig

_REQUIRED_ENV_VAR_MAP = {
    "ssm_prefix": "SSM_PREFIX",
    "environment": "ENVIRONMENT",
    "certificate_expiry_metric_name": "CERTIFICATE_EXPIRY_METRIC_NAME",
    "certificate_expiry_metric_namespace": "CERTIFICATE_EXPIRY_METRIC_NAMESPACE",
    "event_publisher_event_bus_arn": "EVENT_PUBLISHER_EVENT_BUS_ARN",
    "event_publisher_dlq_url": "EVENT_PUBLISHER_DLQ_URL",
    "dlq_url": "DLQ_URL",
}


class Config(BaseMeshConfig):
    """
    Represents the configuration of the MESH Acknowledger application.

    Inherits common MESH configuration from BaseMeshConfig.
    """

    _REQUIRED_ENV_VAR_MAP = _REQUIRED_ENV_VAR_MAP

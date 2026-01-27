"""
Module for configuring MESH Acknowledger application
"""
from dl_utils import BaseMeshConfig

_REQUIRED_ENV_VAR_MAP = {
    "ssm_mesh_prefix": "SSM_MESH_PREFIX",
    "ssm_senders_prefix": "SSM_SENDERS_PREFIX",
    "environment": "ENVIRONMENT",
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

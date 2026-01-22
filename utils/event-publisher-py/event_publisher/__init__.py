"""
Event Publisher for AWS EventBridge with DLQ support.

This module provides a Python equivalent of the TypeScript EventPublisher
for publishing CloudEvents to EventBridge.
"""

from .event_publisher import EventPublisher
from . import models

__all__ = [
    'EventPublisher',
    'models'
]

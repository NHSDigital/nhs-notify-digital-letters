"""
MESH Acknowledge Lambda

This lambda handles acknowledging received MESH files, by sending a message to the MESH inbox of
their sender.
"""

__version__ = '0.1.0'
from .handler import *

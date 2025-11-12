"""lambda handler for mesh poll application"""

from .config import log


def handler(_, __):
    """lambda handler for mesh poll application"""
    log.info('Polling for new messages from MESH...')

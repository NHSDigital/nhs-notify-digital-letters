"""
Module representing possible errors within this application
"""

import traceback


def format_exception(exception):
    """
    Returns a nicely formatted exception string
    """
    return ''.join(traceback.format_exception(
        type(exception), exception, exception.__traceback__))

class MeshMessageNotFound(Exception):
    """
    Indicates an invalid MESH message could not be retrieved
    """

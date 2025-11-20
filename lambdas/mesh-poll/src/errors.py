"""
Module representing possible errors within this application
"""

import traceback


class AuthorizationError(Exception):
    """
    Error representing when a sender is not authorized to perform the requested action
    """


class InvalidMeshEndpointError(Exception):
    """
    Indicates an invalid MESH endpoint in configuration
    """


class InvalidEnvironmentVariableError(Exception):
    """
    Indicates an invalid environment variable
    """


def format_exception(exception):
    """
    Returns a nicely formatted exception string
    """
    return ''.join(traceback.format_exception(
        type(exception), exception, exception.__traceback__))

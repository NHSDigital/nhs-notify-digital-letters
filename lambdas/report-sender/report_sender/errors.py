"""
Module representing possible errors within this application
"""

class InvalidSenderDetailsError(Exception):
    """
    Indicates that the sender is missing or the details are invalid
    """

class ReportNotFoundError(Exception):
    """
    Indicates that the report was not found
    """

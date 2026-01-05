"""
Tests for Lambda handler
"""
from unittest.mock import Mock
from mesh_acknowledge.handler import handler


def setup_mocks():
    """
    Create all mock objects needed for handler testing
    """
    mock_context = Mock()

    return mock_context


class TestHandler:
    """Test suite for Lambda handler"""

    def test_handler_success(self):
        """Test successful handler execution"""
        (mock_context) = setup_mocks()

        # Execute handler
        handler(None, mock_context)

    def test_handler_error(self):
        """Test handler execution when an exception is raised"""
        (mock_context) = setup_mocks()

        # This test should raise an exception

        # Execute handler
        handler(None, mock_context)

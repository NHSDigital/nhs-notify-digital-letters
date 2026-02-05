import pytest
from unittest.mock import patch, MagicMock
import structlog
from dl_utils import log_config
import importlib
import json

class TestLogConfig:
    def test_log_output_is_json_formatted(self, capsys):
        """Test that log output is JSON formatted."""

        # Create a new logger with the configured settings
        test_log = structlog.get_logger()

        # Log a test message
        test_log.info("test_event", test_key="test_value")

        # Capture output
        captured = capsys.readouterr()

        # Verify output is valid JSON
        try:
            log_output = json.loads(captured.out.strip())
            assert "event" in log_output
            assert log_output["event"] == "test_event"
            assert "test_key" in log_output
            assert log_output["test_key"] == "test_value"
        except json.JSONDecodeError:
            pytest.fail("Log output should be valid JSON")

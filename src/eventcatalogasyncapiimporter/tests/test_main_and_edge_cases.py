"""
Tests for main() function and CLI interface.

Tests cover:
- Command-line argument parsing
- Main function execution
- Error handling
- Verbose mode
- Deprecated flags
"""

import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import yaml

# Import the main function and importer
sys.path.insert(0, str(Path(__file__).parent.parent))
from import_asyncapi import main, AsyncAPIImporter


@pytest.fixture
def temp_dirs():
    """Create temporary directories for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        asyncapi_dir = temp_path / "asyncapi"
        eventcatalog_dir = temp_path / "eventcatalog"

        asyncapi_dir.mkdir()
        eventcatalog_dir.mkdir()

        yield {
            "temp_dir": temp_path,
            "asyncapi_dir": asyncapi_dir,
            "eventcatalog_dir": eventcatalog_dir,
        }


class TestMainFunction:
    """Test main() function and CLI interface."""

    def test_main_with_default_args(self, temp_dirs, monkeypatch):
        """Test main() with default arguments."""
        # Mock sys.argv
        test_args = [
            "import_asyncapi.py",
            "--asyncapi-dir", str(temp_dirs["asyncapi_dir"]),
            "--eventcatalog-dir", str(temp_dirs["eventcatalog_dir"]),
        ]

        with patch.object(sys, 'argv', test_args):
            # Should not raise an error
            main()

    def test_main_with_verbose(self, temp_dirs, capsys):
        """Test main() with verbose flag."""
        test_args = [
            "import_asyncapi.py",
            "--asyncapi-dir", str(temp_dirs["asyncapi_dir"]),
            "--eventcatalog-dir", str(temp_dirs["eventcatalog_dir"]),
            "--verbose",
        ]

        with patch.object(sys, 'argv', test_args):
            main()

        captured = capsys.readouterr()
        assert "✅ Import completed successfully!" in captured.out

    def test_main_with_custom_parent_domain(self, temp_dirs):
        """Test main() with custom parent domain."""
        # Create a sample AsyncAPI file so the import actually runs
        asyncapi_data = {
            "asyncapi": "3.0.0",
            "info": {
                "title": "NHS Notify Digital Letters - Test Service",
                "version": "1.0.0",
                "x-service-metadata": {
                    "parent": "Test SubDomain",
                },
            },
        }
        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(asyncapi_data, f)

        test_args = [
            "import_asyncapi.py",
            "--asyncapi-dir", str(temp_dirs["asyncapi_dir"]),
            "--eventcatalog-dir", str(temp_dirs["eventcatalog_dir"]),
            "--parent-domain", "Custom Domain",
        ]

        with patch.object(sys, 'argv', test_args):
            main()

        # Check that custom domain was created
        parent_domain_dir = temp_dirs["eventcatalog_dir"] / "domains" / "custom-domain"
        assert parent_domain_dir.exists()

    def test_main_with_deprecated_domain_flag(self, temp_dirs, capsys):
        """Test main() with deprecated --domain flag."""
        test_args = [
            "import_asyncapi.py",
            "--asyncapi-dir", str(temp_dirs["asyncapi_dir"]),
            "--eventcatalog-dir", str(temp_dirs["eventcatalog_dir"]),
            "--domain", "Deprecated Domain",
        ]

        with patch.object(sys, 'argv', test_args):
            main()

        captured = capsys.readouterr()
        assert "deprecated" in captured.err.lower()

    def test_main_with_error(self, temp_dirs):
        """Test main() error handling."""
        # Use non-existent directory to trigger error
        test_args = [
            "import_asyncapi.py",
            "--asyncapi-dir", "/nonexistent/directory",
            "--eventcatalog-dir", str(temp_dirs["eventcatalog_dir"]),
        ]

        with patch.object(sys, 'argv', test_args):
            with pytest.raises(SystemExit) as exc_info:
                # Mock import_all to raise an exception
                with patch.object(AsyncAPIImporter, 'import_all', side_effect=Exception("Test error")):
                    main()

            assert exc_info.value.code == 1


class TestEventWithSchemaFiles:
    """Test event creation with schema file copying."""

    def test_event_with_schema_base_path(self, temp_dirs):
        """Test creating event with schema base path (but no actual schema file)."""
        schema_base = temp_dirs["temp_dir"] / "schemas"
        schema_base.mkdir()

        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            schema_base_path=schema_base,
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        asyncapi_data = {
            "info": {
                "title": "Test Service",
                "version": "1.0.0",
            }
        }
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", asyncapi_data
        )

        message_data = {
            "name": "TestEvent",
            "summary": "Test event",
            "description": "Test description",
            "contentType": "application/json",
            "payload": {
                "$ref": "https://notify.nhs.uk/cloudevents/test/schema.json"
            }
        }

        # Should handle missing schema file gracefully
        importer.create_event_structure(
            service_path,
            "TestEvent",
            "test/channel",
            message_data,
            "send"
        )

        event_dir = service_path / "events" / "testevent"
        assert event_dir.exists()

    def test_event_with_existing_schema_file(self, temp_dirs):
        """Test creating event with existing schema file."""
        schema_base = temp_dirs["temp_dir"] / "schemas"
        schema_dir = schema_base / "test"
        schema_dir.mkdir(parents=True)

        # Create a mock schema file
        schema_file = schema_dir / "schema.json"
        schema_file.write_text('{"type": "object"}')

        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            schema_base_path=schema_base,
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        asyncapi_data = {
            "info": {
                "title": "Test Service",
                "version": "1.0.0",
            }
        }
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", asyncapi_data
        )

        message_data = {
            "name": "TestEvent",
            "summary": "Test event",
            "description": "Test description",
            "contentType": "application/json",
            "payload": {
                "$ref": "https://notify.nhs.uk/cloudevents/test/schema.json"
            }
        }

        importer.create_event_structure(
            service_path,
            "TestEvent",
            "test/channel",
            message_data,
            "send"
        )

        event_dir = service_path / "events" / "testevent"
        # Check that schema file was copied
        copied_schema = event_dir / "schema.json"
        assert copied_schema.exists()


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_import_all_with_multiple_files(self, temp_dirs):
        """Test importing multiple AsyncAPI files."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        # Create multiple AsyncAPI files
        for i in range(3):
            asyncapi_data = {
                "asyncapi": "3.0.0",
                "info": {
                    "title": f"NHS Notify Digital Letters - Service {i}",
                    "version": "1.0.0",
                    "x-service-metadata": {
                        "parent": f"Domain {i}",
                    },
                },
                "channels": {
                    f"channel_{i}": {
                        "address": f"test/channel/{i}",
                        "messages": {
                            f"Event{i}": {
                                "name": f"Event{i}",
                                "summary": f"Event {i}",
                                "description": f"Test event {i}",
                            }
                        },
                    }
                },
            }

            file_path = temp_dirs["asyncapi_dir"] / f"asyncapi-service-{i}.yaml"
            with open(file_path, "w") as f:
                yaml.dump(asyncapi_data, f)

        importer.import_all()

        # Should have created multiple services
        assert len(importer.created_services) >= 3

    def test_create_event_with_minimal_message_data(self, temp_dirs):
        """Test creating event with minimal message data."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        asyncapi_data = {
            "info": {
                "title": "Test Service",
            }
        }
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", asyncapi_data
        )

        # Minimal message data
        message_data = {}

        importer.create_event_structure(
            service_path,
            "MinimalEvent",
            "test/channel",
            message_data,
            "send"
        )

        event_dir = service_path / "events" / "minimalevent"
        assert event_dir.exists()

    def test_sanitize_name_edge_cases(self, temp_dirs):
        """Test name sanitization with edge cases."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        # Empty string
        assert importer.sanitize_name("") == ""

        # Only special characters
        result = importer.sanitize_name("!!!@@@###")
        assert result == ""

        # Numbers only
        assert importer.sanitize_name("12345") == "12345"

        # Mixed case with numbers
        assert importer.sanitize_name("Test123Service456") == "test123service456"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Comprehensive tests for AsyncAPI to EventCatalog importer.

Tests cover all functionality including:
- Initialization and configuration
- File loading and parsing
- Name sanitization and extraction
- Directory structure creation
- Service, domain, and channel management
- Relationship tracking and updates
- Full import workflow
- Error handling and edge cases
"""

import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

import pytest
import yaml

# Import the importer class
sys.path.insert(0, str(Path(__file__).parent.parent))
from import_asyncapi import AsyncAPIImporter


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


@pytest.fixture
def sample_asyncapi():
    """Sample AsyncAPI specification for testing."""
    return {
        "asyncapi": "3.0.0",
        "info": {
            "title": "NHS Notify Digital Letters - Test Service",
            "version": "2025-10-draft",
            "description": "Test service description",
            "contact": {"name": "Test Team", "url": "https://test.com"},
            "x-service-metadata": {
                "c4type": "code",
                "owner": "Test Owner",
                "parent": "Test Domain",
            },
        },
        "channels": {
            "test_event_channel_v1": {
                "address": "test/event/channel/v1",
                "messages": {
                    "TestEvent": {
                        "name": "TestEvent",
                        "title": "TestEvent",
                        "summary": "Event: test.event.v1",
                        "description": "This is a test event.",
                        "contentType": "application/cloudevents+json",
                        "payload": {"$ref": "https://example.com/schema.json"},
                    }
                },
                "description": "Test Domain - test.event.v1",
            }
        },
        "operations": {
            "send_test_event": {
                "action": "send",
                "channel": {"$ref": "#/channels/test_event_channel_v1"},
                "summary": "Send TestEvent",
                "description": "Test service raises this event",
                "messages": [
                    {"$ref": "#/channels/test_event_channel_v1/messages/TestEvent"}
                ],
            }
        },
        "components": {"messages": {}},
    }


@pytest.fixture
def sample_asyncapi_file(temp_dirs, sample_asyncapi):
    """Create a sample AsyncAPI file for testing."""
    asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test-service.yaml"
    with open(asyncapi_file, "w") as f:
        yaml.dump(sample_asyncapi, f)
    return asyncapi_file


class TestImporterInitialization:
    """Test importer initialization and configuration."""

    def test_initialization_with_defaults(self, temp_dirs):
        """Test importer can be initialized with default settings."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.asyncapi_dir == temp_dirs["asyncapi_dir"]
        assert importer.eventcatalog_dir == temp_dirs["eventcatalog_dir"]
        assert importer.parent_domain_name == "Digital Letters"
        assert importer.verbose is False
        assert importer.schema_base_path is None

    def test_initialization_with_custom_parent_domain(self, temp_dirs):
        """Test initialization with custom parent domain name."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Custom Parent",
        )

        assert importer.parent_domain_name == "Custom Parent"

    def test_initialization_with_verbose(self, temp_dirs):
        """Test initialization with verbose logging enabled."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            verbose=True,
        )

        assert importer.verbose is True

    def test_initialization_with_schema_base_path(self, temp_dirs):
        """Test initialization with custom schema base path."""
        schema_path = Path("/custom/schema/path")
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            schema_base_path=schema_path,
        )

        assert importer.schema_base_path == schema_path

    def test_initialization_creates_tracking_sets(self, temp_dirs):
        """Test that initialization creates empty tracking sets."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert len(importer.created_services) == 0
        assert len(importer.created_events) == 0
        assert len(importer.created_channels) == 0
        assert importer.created_parent_domain is False

    def test_initialization_creates_relationship_dicts(self, temp_dirs):
        """Test that initialization creates empty relationship dictionaries."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert isinstance(importer.subdomain_services, dict)
        assert isinstance(importer.service_events, dict)
        assert isinstance(importer.created_subdomains, dict)


class TestLogging:
    """Test logging functionality."""

    def test_log_info_verbose_mode(self, temp_dirs, capsys):
        """Test INFO logging in verbose mode."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            verbose=True,
        )

        importer.log("Test message", "INFO")
        captured = capsys.readouterr()
        assert "[INFO] Test message" in captured.out

    def test_log_info_non_verbose_mode(self, temp_dirs, capsys):
        """Test INFO logging is suppressed in non-verbose mode."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            verbose=False,
        )

        importer.log("Test message", "INFO")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_log_error_always_shown(self, temp_dirs, capsys):
        """Test ERROR logging is always shown."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            verbose=False,
        )

        importer.log("Error message", "ERROR")
        captured = capsys.readouterr()
        assert "[ERROR] Error message" in captured.out

    def test_log_warning_always_shown(self, temp_dirs, capsys):
        """Test WARNING logging is always shown."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            verbose=False,
        )

        importer.log("Warning message", "WARNING")
        captured = capsys.readouterr()
        assert "[WARNING] Warning message" in captured.out


class TestFileLoading:
    """Test AsyncAPI file loading and parsing."""

    def test_load_valid_asyncapi_file(self, temp_dirs, sample_asyncapi_file, sample_asyncapi):
        """Test loading a valid AsyncAPI file."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        data = importer.load_asyncapi_file(sample_asyncapi_file)

        assert data is not None
        assert data["asyncapi"] == "3.0.0"
        assert "channels" in data
        assert data["info"]["title"] == sample_asyncapi["info"]["title"]

    def test_load_nonexistent_file(self, temp_dirs):
        """Test loading a non-existent file returns None."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        nonexistent_file = temp_dirs["asyncapi_dir"] / "nonexistent.yaml"
        data = importer.load_asyncapi_file(nonexistent_file)

        assert data is None

    def test_load_invalid_yaml_file(self, temp_dirs):
        """Test loading an invalid YAML file returns None."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        invalid_file = temp_dirs["asyncapi_dir"] / "invalid.yaml"
        with open(invalid_file, "w") as f:
            f.write("invalid: yaml: content: [[[")

        data = importer.load_asyncapi_file(invalid_file)

        assert data is None

    def test_load_empty_file(self, temp_dirs):
        """Test loading an empty file."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        empty_file = temp_dirs["asyncapi_dir"] / "empty.yaml"
        empty_file.touch()

        data = importer.load_asyncapi_file(empty_file)

        assert data is None


class TestNameSanitization:
    """Test name sanitization for file paths and IDs."""

    def test_sanitize_simple_name(self, temp_dirs):
        """Test sanitizing a simple name."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("Test Service") == "test-service"

    def test_sanitize_name_with_hyphens(self, temp_dirs):
        """Test sanitizing a name that already has hyphens."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("MESH-Poller-Service") == "mesh-poller-service"

    def test_sanitize_name_with_underscores(self, temp_dirs):
        """Test sanitizing a name with underscores."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("Test_Service_123") == "test-service-123"

    def test_sanitize_name_with_special_chars(self, temp_dirs):
        """Test sanitizing a name with special characters."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("Test@Service#123!") == "test-service-123"

    def test_sanitize_name_with_leading_trailing_spaces(self, temp_dirs):
        """Test sanitizing a name with leading/trailing spaces."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("  Test  ") == "test"

    def test_sanitize_name_with_multiple_spaces(self, temp_dirs):
        """Test sanitizing a name with multiple consecutive spaces."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("Test   Service") == "test-service"

    def test_sanitize_name_already_sanitized(self, temp_dirs):
        """Test sanitizing a name that's already properly formatted."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        assert importer.sanitize_name("test-service") == "test-service"


class TestServiceNameExtraction:
    """Test service name extraction from AsyncAPI specifications."""

    def test_extract_service_name_from_title(self, temp_dirs, sample_asyncapi):
        """Test extracting service name from AsyncAPI title."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        service_name = importer.extract_service_name(sample_asyncapi)
        assert service_name == "Test Service"

    def test_extract_service_name_removes_prefix(self, temp_dirs):
        """Test that NHS Notify Digital Letters prefix is removed."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {
            "info": {
                "title": "NHS Notify Digital Letters - MESH Service"
            }
        }

        service_name = importer.extract_service_name(asyncapi_data)
        assert service_name == "MESH Service"

    def test_extract_service_name_no_info(self, temp_dirs):
        """Test extracting service name when info section is missing."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {}
        service_name = importer.extract_service_name(asyncapi_data)
        assert service_name == "Unknown Service"

    def test_extract_service_name_no_title(self, temp_dirs):
        """Test extracting service name when title is missing."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {"info": {}}
        service_name = importer.extract_service_name(asyncapi_data)
        assert service_name == "Unknown Service"


class TestSubdomainExtraction:
    """Test subdomain extraction from service metadata."""

    def test_extract_subdomain_from_metadata(self, temp_dirs, sample_asyncapi):
        """Test extracting subdomain from service metadata."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain = importer.extract_subdomain_from_service("Test Service", sample_asyncapi)
        assert subdomain == "Test Domain"

    def test_extract_subdomain_mesh_fallback(self, temp_dirs):
        """Test subdomain fallback for MESH services."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {"info": {}}
        subdomain = importer.extract_subdomain_from_service("MESH Poller Service", asyncapi_data)
        assert subdomain == "MESH Services"

    def test_extract_subdomain_pdm_fallback(self, temp_dirs):
        """Test subdomain fallback for PDM services."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {"info": {}}
        subdomain = importer.extract_subdomain_from_service("PDM Integration Service", asyncapi_data)
        assert subdomain == "PDM Services"

    def test_extract_subdomain_reporting_fallback(self, temp_dirs):
        """Test subdomain fallback for reporting services."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {"info": {}}
        subdomain = importer.extract_subdomain_from_service("Reporting Service", asyncapi_data)
        assert subdomain == "Reporting"

    def test_extract_subdomain_core_services_fallback(self, temp_dirs):
        """Test subdomain fallback for other services."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {"info": {}}
        subdomain = importer.extract_subdomain_from_service("Generic Service", asyncapi_data)
        assert subdomain == "Core Services"


class TestParentDomainStructure:
    """Test parent domain directory structure creation."""

    def test_create_parent_domain_structure(self, temp_dirs):
        """Test creating parent domain directory structure."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        parent_path = importer.create_parent_domain_structure()

        assert parent_path.exists()
        assert parent_path.name == "test-parent"
        assert (parent_path / "index.mdx").exists()
        assert importer.created_parent_domain is True

    def test_create_parent_domain_structure_idempotent(self, temp_dirs):
        """Test that creating parent domain twice doesn't duplicate."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        parent_path1 = importer.create_parent_domain_structure()
        parent_path2 = importer.create_parent_domain_structure()

        assert parent_path1 == parent_path2
        assert importer.created_parent_domain is True

    def test_parent_domain_index_content(self, temp_dirs):
        """Test parent domain index.mdx content."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        parent_path = importer.create_parent_domain_structure()

        with open(parent_path / "index.mdx", "r") as f:
            content = f.read()

        assert "Test Parent" in content
        assert "test-parent" in content
        assert "## Overview" in content
        assert "<NodeGraph />" in content


class TestSubdomainStructure:
    """Test subdomain directory structure creation."""

    def test_create_subdomain_structure(self, temp_dirs):
        """Test creating subdomain directory structure."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")

        assert subdomain_path.exists()
        assert subdomain_path.name == "test-subdomain"
        assert (subdomain_path / "index.mdx").exists()
        assert subdomain_path.parent.name == "subdomains"
        assert "test-subdomain" in importer.created_subdomains

    def test_subdomain_under_parent_domain(self, temp_dirs):
        """Test that subdomain is created under parent domain."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        parent_path = temp_dirs["eventcatalog_dir"] / "domains" / "test-parent"

        assert subdomain_path.parent.parent == parent_path

    def test_subdomain_index_content(self, temp_dirs):
        """Test subdomain index.mdx content."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")

        with open(subdomain_path / "index.mdx", "r") as f:
            content = f.read()

        assert "Test SubDomain" in content
        assert "test-subdomain" in content
        assert "## Overview" in content
        assert "<NodeGraph />" in content

    def test_create_multiple_subdomains(self, temp_dirs):
        """Test creating multiple subdomains."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain1 = importer.create_subdomain_structure("SubDomain One")
        subdomain2 = importer.create_subdomain_structure("SubDomain Two")

        assert subdomain1.exists()
        assert subdomain2.exists()
        assert len(importer.created_subdomains) == 2


class TestDomainStructureBackwardCompatibility:
    """Test deprecated create_domain_structure method."""

    def test_create_domain_structure_calls_subdomain(self, temp_dirs):
        """Test that create_domain_structure calls create_subdomain_structure."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        domain_path = importer.create_domain_structure("Test Domain")

        # Should behave same as create_subdomain_structure
        assert domain_path.exists()
        assert (domain_path / "index.mdx").exists()
        assert domain_path.parent.name == "subdomains"


class TestChannelStructure:
    """Test channel directory structure creation."""

    def test_create_channel_structure(self, temp_dirs, sample_asyncapi):
        """Test creating channel structure."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        channel_data = sample_asyncapi["channels"]["test_event_channel_v1"]
        importer.create_channel_structure("test_event_channel_v1", channel_data)

        # Channel should be a directory with index.mdx inside
        channel_dir = importer.channels_dir / "test-event-channel-v1"
        channel_file = channel_dir / "index.mdx"
        assert channel_dir.exists()
        assert channel_file.exists()
        assert "test-event-channel-v1" in importer.created_channels

    def test_channel_file_content(self, temp_dirs, sample_asyncapi):
        """Test channel file content."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        channel_data = sample_asyncapi["channels"]["test_event_channel_v1"]
        importer.create_channel_structure("test_event_channel_v1", channel_data)

        channel_dir = importer.channels_dir / "test-event-channel-v1"
        channel_file = channel_dir / "index.mdx"
        with open(channel_file, "r") as f:
            content = f.read()

        assert "test-event-channel-v1" in content
        assert "test/event/channel/v1" in content

    def test_create_channel_idempotent(self, temp_dirs, sample_asyncapi):
        """Test that creating same channel twice doesn't duplicate."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        channel_data = sample_asyncapi["channels"]["test_event_channel_v1"]

        # Create twice
        importer.create_channel_structure("test_event_channel_v1", channel_data)
        importer.create_channel_structure("test_event_channel_v1", channel_data)

        # Should still only have one entry (created_channels is a set)
        assert len([c for c in importer.created_channels if c == "test-event-channel-v1"]) == 1
        assert "test-event-channel-v1" in importer.created_channels


class TestFullImport:
    """Test full import workflow."""

    def test_full_import_process(self, temp_dirs, sample_asyncapi_file):
        """Test full import process creates all structures."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        importer.import_all()

        # Verify structures were created
        assert len(importer.created_services) > 0
        assert len(importer.created_channels) > 0

        # Verify parent domain exists
        parent_domain_dir = temp_dirs["eventcatalog_dir"] / "domains" / "test-parent"
        assert parent_domain_dir.exists()

        # Verify subdomains directory exists
        subdomains_dir = parent_domain_dir / "subdomains"
        assert subdomains_dir.exists()

        # Verify at least one subdomain was created
        subdomains = list(subdomains_dir.iterdir())
        assert len(subdomains) > 0

    def test_import_with_no_asyncapi_files(self, temp_dirs):
        """Test import with no AsyncAPI files."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        # Should not raise an error
        importer.import_all()

        assert len(importer.created_services) == 0

    def test_import_creates_channels_directory(self, temp_dirs, sample_asyncapi_file):
        """Test that import creates channels directory."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        importer.import_all()

        channels_dir = temp_dirs["eventcatalog_dir"] / "channels"
        assert channels_dir.exists()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])

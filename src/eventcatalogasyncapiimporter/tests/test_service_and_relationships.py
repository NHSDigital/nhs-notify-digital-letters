"""
Additional comprehensive tests for AsyncAPI importer - service structure and relationships.

Tests cover:
- Service structure creation
- Event structure creation within services
- Relationship tracking and updates
- Process AsyncAPI file workflow
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


class TestServiceStructure:
    """Test service directory structure creation."""

    def test_create_service_structure(self, temp_dirs, sample_asyncapi):
        """Test creating service directory structure under subdomain."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi, "Test SubDomain"
        )

        # Check service directory structure
        assert service_path.exists()
        assert (service_path / "index.mdx").exists()
        assert service_path.parent.name == "services"
        assert service_path.parent.parent == subdomain_path
        assert "test-service" in importer.created_services

    def test_service_index_content(self, temp_dirs, sample_asyncapi):
        """Test service index.mdx content."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi, "Test SubDomain"
        )

        with open(service_path / "index.mdx", "r") as f:
            content = f.read()

        assert "Test Service" in content
        assert "test-service" in content
        assert "Test service description" in content
        assert "Test Owner" in content  # from metadata

    def test_service_version_normalization(self, temp_dirs):
        """Test that non-semver versions are normalized."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_data = {
            "info": {
                "title": "Test Service",
                "version": "2025-10-draft",  # Non-semver
                "description": "Test",
            }
        }

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", asyncapi_data
        )

        with open(service_path / "index.mdx", "r") as f:
            content = f.read()

        # Should be normalized to semver
        assert "version: 1.0.0" in content

    def test_service_with_missing_metadata(self, temp_dirs):
        """Test creating service with minimal metadata."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        minimal_asyncapi = {
            "info": {
                "title": "Minimal Service",
            }
        }

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Minimal Service", minimal_asyncapi
        )

        assert service_path.exists()
        assert (service_path / "index.mdx").exists()

    def test_create_service_idempotent(self, temp_dirs, sample_asyncapi):
        """Test that creating same service twice updates it."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")

        # Create twice
        service_path1 = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )
        service_path2 = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )

        assert service_path1 == service_path2
        assert "test-service" in importer.created_services


class TestEventStructure:
    """Test event structure creation within services."""

    def test_create_event_structure(self, temp_dirs, sample_asyncapi):
        """Test creating event structure within a service."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )

        message_data = sample_asyncapi["channels"]["test_event_channel_v1"]["messages"]["TestEvent"]

        importer.create_event_structure(
            service_path,
            "TestEvent",
            "test/event/channel/v1",
            message_data,
            "send"
        )

        event_dir = service_path / "events" / "testevent"
        assert event_dir.exists()
        assert (event_dir / "index.mdx").exists()

    def test_event_index_content(self, temp_dirs, sample_asyncapi):
        """Test event index.mdx content."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )

        message_data = sample_asyncapi["channels"]["test_event_channel_v1"]["messages"]["TestEvent"]

        importer.create_event_structure(
            service_path,
            "TestEvent",
            "test/event/channel/v1",
            message_data,
            "send"
        )

        event_file = service_path / "events" / "testevent" / "index.mdx"
        with open(event_file, "r") as f:
            content = f.read()

        assert "TestEvent" in content
        assert "test/event/channel/v1" in content
        assert "This is a test event." in content
        assert "published" in content.lower()  # send action = published

    def test_event_receive_action(self, temp_dirs, sample_asyncapi):
        """Test event with receive action."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )

        message_data = sample_asyncapi["channels"]["test_event_channel_v1"]["messages"]["TestEvent"]

        importer.create_event_structure(
            service_path,
            "TestEvent",
            "test/event/channel/v1",
            message_data,
            "receive"
        )

        event_file = service_path / "events" / "testevent" / "index.mdx"
        with open(event_file, "r") as f:
            content = f.read()

        assert "received" in content.lower()  # receive action = received

    def test_create_event_idempotent(self, temp_dirs, sample_asyncapi):
        """Test that creating same event twice doesn't duplicate."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        subdomain_path = importer.create_subdomain_structure("Test SubDomain")
        service_path = importer.create_service_structure(
            subdomain_path, "Test Service", sample_asyncapi
        )

        message_data = sample_asyncapi["channels"]["test_event_channel_v1"]["messages"]["TestEvent"]

        # Create twice
        importer.create_event_structure(
            service_path, "TestEvent", "test/event/channel/v1", message_data, "send"
        )
        importer.create_event_structure(
            service_path, "TestEvent", "test/event/channel/v1", message_data, "send"
        )

        # Check only one event was created
        events_dir = service_path / "events"
        event_dirs = list(events_dir.iterdir())
        assert len(event_dirs) == 1


class TestProcessAsyncAPIFile:
    """Test processing of AsyncAPI files."""

    def test_process_asyncapi_file(self, temp_dirs, sample_asyncapi):
        """Test processing a complete AsyncAPI file."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Verify service was created
        assert len(importer.created_services) > 0

        # Verify channel was created
        assert len(importer.created_channels) > 0

    def test_process_invalid_asyncapi_file(self, temp_dirs):
        """Test processing an invalid AsyncAPI file."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        invalid_file = temp_dirs["asyncapi_dir"] / "invalid.yaml"
        with open(invalid_file, "w") as f:
            f.write("invalid: yaml: [[[")

        # Should not raise an error
        importer.process_asyncapi_file(invalid_file)

    def test_process_asyncapi_without_channels(self, temp_dirs):
        """Test processing AsyncAPI file without channels."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        minimal_asyncapi = {
            "asyncapi": "3.0.0",
            "info": {
                "title": "NHS Notify Digital Letters - Minimal Service",
                "version": "1.0.0",
                "x-service-metadata": {
                    "parent": "Test Domain",
                },
            },
        }

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-minimal.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(minimal_asyncapi, f)

        # Should not raise an error
        importer.process_asyncapi_file(asyncapi_file)


class TestRelationshipTracking:
    """Test relationship tracking for services and events."""

    def test_subdomain_services_tracking(self, temp_dirs, sample_asyncapi):
        """Test that subdomain-service relationships are tracked."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Check that subdomain services are tracked
        assert len(importer.subdomain_services) > 0

    def test_service_events_tracking(self, temp_dirs, sample_asyncapi):
        """Test that service-event relationships are tracked."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Check that service events are tracked
        assert len(importer.service_events) > 0


class TestUpdateRelationships:
    """Test relationship update methods."""

    def test_update_subdomain_relationships(self, temp_dirs, sample_asyncapi):
        """Test updating subdomain relationships."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Should not raise an error
        importer.update_subdomain_relationships()

    def test_update_parent_domain_relationships(self, temp_dirs, sample_asyncapi):
        """Test updating parent domain relationships."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
            parent_domain_name="Test Parent",
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Should not raise an error
        importer.update_parent_domain_relationships()

    def test_update_service_relationships(self, temp_dirs, sample_asyncapi):
        """Test updating service relationships."""
        importer = AsyncAPIImporter(
            temp_dirs["asyncapi_dir"],
            temp_dirs["eventcatalog_dir"],
        )

        asyncapi_file = temp_dirs["asyncapi_dir"] / "asyncapi-test.yaml"
        with open(asyncapi_file, "w") as f:
            yaml.dump(sample_asyncapi, f)

        importer.process_asyncapi_file(asyncapi_file)

        # Should not raise an error
        importer.update_service_relationships()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])

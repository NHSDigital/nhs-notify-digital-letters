import pytest
from pydantic import ValidationError
from event_publisher.models import CloudEvent, MeshInboxMessageEvent


class TestCloudEvent:
    """Test CloudEvent validation"""

    @pytest.fixture
    def valid_event(self):
        return {
            'id': '550e8400-e29b-41d4-a716-446655440001',
            'specversion': '1.0',
            'source': '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
            'subject': 'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
            'type': 'uk.nhs.notify.digital.letters.example.v1',
            'time': '2024-07-10T14:30:00Z',
            'recordedtime': '2024-07-10T14:30:00.250Z',
            'severitynumber': 2,
            'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            'dataschema': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
            'data': {
                'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
                'messageReference': 'ref1',
                'senderId': 'sender1',
            },
        }

    def test_parses_valid_cloud_event(self, valid_event):
        event = CloudEvent(**valid_event)
        assert str(event.id) == valid_event['id']
        assert event.source == valid_event['source']
        assert event.subject == valid_event['subject']
        assert event.type == valid_event['type']

    def test_fails_for_missing_required_fields(self):
        with pytest.raises(ValidationError):
            CloudEvent(**{})

    def test_fails_for_invalid_source_pattern(self, valid_event):
        invalid = valid_event.copy()
        invalid['source'] = 'invalid-source'
        with pytest.raises(ValidationError) as exc_info:
            CloudEvent(**invalid)
        assert 'source' in str(exc_info.value).lower()

    def test_fails_for_invalid_subject_pattern(self, valid_event):
        invalid = valid_event.copy()
        invalid['subject'] = 'invalid-subject'
        with pytest.raises(ValidationError) as exc_info:
            CloudEvent(**invalid)
        assert 'subject' in str(exc_info.value).lower()

    def test_fails_for_invalid_type_pattern(self, valid_event):
        invalid = valid_event.copy()
        invalid['type'] = 'invalid.type'
        with pytest.raises(ValidationError) as exc_info:
            CloudEvent(**invalid)
        assert 'type' in str(exc_info.value).lower()

    def test_allows_any_data_structure(self, valid_event):
        """Base CloudEvent accepts any dict as data, but specific event types validate data structure"""
        event_with_empty_data = valid_event.copy()
        event_with_empty_data['data'] = {}
        # Base CloudEvent accepts any dict
        event = CloudEvent(**event_with_empty_data)
        assert event.data == {}

        # But MeshInboxMessageEvent should reject empty data
        with pytest.raises(ValidationError) as exc_info:
            MeshInboxMessageEvent(**event_with_empty_data)
        assert 'meshMessageId' in str(exc_info.value).lower() or 'field required' in str(exc_info.value).lower()

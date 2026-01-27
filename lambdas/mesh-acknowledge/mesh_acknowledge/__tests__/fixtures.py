"""Fixtures for tests"""
from typing import Dict


def create_downloaded_event_dict(event_id: str) -> Dict[str, str | int | Dict[str, str]]:
    """Create a dictionary representing a MESHInboxMessageDownloaded event"""
    return {
        "id": event_id,
        "specversion": "1.0",
        "source": (
            "/nhs/england/notify/production/primary/"
            'data-plane/digitalletters/mesh'
        ),
        "subject": (
            'customer/920fca11-596a-4eca-9c47-99f624614658/'
            'recipient/769acdd4-6a47-496f-999f-76a6fd2c3959'
        ),
        "type": (
            'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1'
        ),
        "time": '2026-01-08T10:00:00Z',
        "recordedtime": '2026-01-08T10:00:00Z',
        "severitynumber": 2,
        "severitytext": 'INFO',
        "traceparent": '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        "datacontenttype": 'application/json',
        "dataschema": (
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/'
            'digital-letters-mesh-inbox-message-downloaded-data.schema.json'
        ),
        "datacategory": "non-sensitive",
        "dataclassification": "public",
        "dataregulation": "GDPR",
        "data": {
            "meshMessageId": "MSG123456",
            "messageUri": f"https://example.com/ttl/resource/{event_id}",
            "messageReference": "REF123",
            "senderId": "SENDER001",
        }
    }

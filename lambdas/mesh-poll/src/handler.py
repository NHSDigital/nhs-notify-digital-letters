"""lambda handler for mesh poll application"""
from uuid import uuid4
from digital_letters_events import PDMResourceSubmitted


def handler(event_data):
    """lambda handler for mesh poll application"""
    try:
        # Validate and parse an event
        event = PDMResourceSubmitted(**event_data)

        # Access validated fields
        print(event.id)
        print(event.type)
        print(event.data.messageReference)
    except Exception as e:
        print(e)
        raise ValueError("Error processing event") from e

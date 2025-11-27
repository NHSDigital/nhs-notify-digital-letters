from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CloudEvent(BaseModel):
    # Required fields - NHS Notify CloudEvents profile
    profileversion: Literal['1.0.0'] = Field(
        default='1.0.0',
        description='NHS Notify CloudEvents profile semantic version'
    )
    profilepublished: Literal['2025-10'] = Field(
        default='2025-10',
        description='NHS Notify CloudEvents profile publication date'
    )
    specversion: Literal['1.0'] = Field(
        default='1.0',
        description='CloudEvents specification version'
    )
    id: str = Field(
        ...,
        description='Unique identifier for this event instance (UUID)'
    )
    source: str = Field(
        ...,
        description='Event source for digital letters domain'
    )
    subject: str = Field(
        ...,
        description='Path in the form customer/{id}/recipient/{id} where each {id} is a UUID'
    )
    type: str = Field(
        ...,
        description='Concrete versioned event type string'
    )
    time: str = Field(
        ...,
        description='Timestamp when the event occurred (RFC 3339)'
    )
    recordedtime: str = Field(
        ...,
        description='Timestamp when the event was recorded/persisted'
    )
    severitynumber: int = Field(
        ...,
        ge=0,
        le=5,
        description='Numeric severity (TRACE=0, DEBUG=1, INFO=2, WARN=3, ERROR=4, FATAL=5)'
    )
    traceparent: str = Field(
        ...,
        description='W3C Trace Context traceparent header value'
    )
    dataschema: str = Field(
        ...,
        description='Canonical URI of the event data schema'
    )
    data: dict[str, Any] = Field(
        ...,
        description='Digital letters payload'
    )

    # Optional fields
    datacontenttype: Optional[Literal['application/json']] = Field(
        None,
        description='Media type for the data field'
    )
    dataschemaversion: Optional[str] = Field(
        None,
        description='Version of the data schema'
    )
    severitytext: Optional[Literal['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']] = Field(
        None,
        description='Log severity level name'
    )
    tracestate: Optional[str] = Field(
        None,
        description='Optional W3C Trace Context tracestate header value'
    )
    partitionkey: Optional[str] = Field(
        None,
        min_length=1,
        max_length=64,
        description='Partition / ordering key'
    )
    sequence: Optional[str] = Field(
        None,
        description='Zero-padded 20 digit numeric sequence'
    )
    sampledrate: Optional[int] = Field(
        None,
        ge=1,
        description='Sampling factor: number of similar occurrences this event represents'
    )
    dataclassification: Optional[Literal['public', 'internal', 'confidential', 'restricted']] = Field(
        None,
        description='Data sensitivity classification'
    )
    dataregulation: Optional[Literal['GDPR', 'HIPAA', 'PCI-DSS', 'ISO-27001', 'NIST-800-53', 'CCPA']] = Field(
        None,
        description='Regulatory regime tag'
    )
    datacategory: Optional[Literal['non-sensitive', 'standard', 'sensitive', 'special-category']] = Field(
        None,
        description='Data category classification'
    )

    @field_validator('source')
    @classmethod
    def validate_source(cls, v: str) -> str:
        if not v:
            raise ValueError('Source cannot be empty')
        import re
        # Must match NHS Notify CloudEvents pattern
        pattern = r'^/nhs/england/notify/(production|staging|development|uat)/(primary|secondary|dev-\d+)/(data-plane|control-plane)/digitalletters/mesh$'

        if not re.match(pattern, v):
            raise ValueError(
                f'Invalid source pattern: {v}. '
                'Must match /nhs/england/notify/{{environment}}/{{instance}}/{{plane}}/digitalletters/mesh'
            )
        return v

    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v: str) -> str:
        import re
        if not re.match(
            r'^customer/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/recipient/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            v
        ):
            raise ValueError('Subject must be in format customer/{uuid}/recipient/{uuid}')
        return v

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        import re
        if not re.match(r'^uk\.nhs\.notify\.digital\.letters\.[a-z0-9.]+\.v\d+$', v):
            raise ValueError(f'Invalid type pattern: {v}')
        return v

    @field_validator('traceparent')
    @classmethod
    def validate_traceparent(cls, v: str) -> str:
        import re
        if not re.match(r'^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$', v):
            raise ValueError('Invalid traceparent format')
        return v

    @field_validator('partitionkey')
    @classmethod
    def validate_partitionkey(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Partition key must only contain lowercase letters, numbers, and hyphens')
        return v

    @field_validator('sequence')
    @classmethod
    def validate_sequence(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        if not re.match(r'^\d{20}$', v):
            raise ValueError('Sequence must be exactly 20 digits')
        return v

    model_config = ConfigDict(extra='allow')


class MeshInboxMessageData(BaseModel):
    """Data payload for MESH inbox message received event"""
    meshMessageId: str = Field(..., min_length=1)
    senderId: str = Field(..., min_length=1)


class MeshInboxMessageEvent(CloudEvent):
    """Complete CloudEvent for MESH inbox message received"""
    data: MeshInboxMessageData

    @field_validator('data', mode='before')
    @classmethod
    def validate_data(cls, v: Any) -> MeshInboxMessageData:
        """Ensure data is validated as MeshInboxMessageData"""
        if isinstance(v, MeshInboxMessageData):
            return v
        if isinstance(v, dict):
            return MeshInboxMessageData(**v)
        raise ValueError('data must be a dict with meshMessageId and senderId')


class MeshDownloadMessageData(BaseModel):
    """Data payload for MESH inbox message downloaded event"""
    messageReference: str = Field(..., min_length=1)
    senderId: str = Field(..., min_length=1)
    messageUri: str = Field(..., min_length=1)


class MeshDownloadMessageEvent(CloudEvent):
    """Complete CloudEvent for MESH inbox message downloaded"""
    data: MeshDownloadMessageData

    @field_validator('data', mode='before')
    @classmethod
    def validate_data(cls, v: Any) -> MeshDownloadMessageData:
        """Ensure data is validated as MeshDownloadMessageData"""
        if isinstance(v, MeshDownloadMessageData):
            return v
        if isinstance(v, dict):
            return MeshDownloadMessageData(**v)
        raise ValueError('data must be a dict with messageReference, senderId, and messageUri')

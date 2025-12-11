import { GuardDutyScanResultNotificationEvent } from 'aws-lambda';

const baseEvent: GuardDutyScanResultNotificationEvent = {
  id: '72c7d362-737a-6dce-fc78-9e27a0171419',
  version: '0',
  source: 'aws.guardduty',
  account: '111122223333',
  time: '2024-02-28T01:01:01Z',
  region: 'us-east-1',
  resources: [
    'arn:aws:guardduty:us-east-1:111122223333:malware-protection-plan/b4c7f464ab3a4EXAMPLE',
  ],
  'detail-type': 'GuardDuty Malware Protection Object Scan Result',
  detail: {
    schemaVersion: '1.0',
    scanStatus: 'COMPLETED',
    resourceType: 'S3_OBJECT',
    s3ObjectDetails: {
      bucketName: 'unscanned-bucket',
      objectKey: 'dl/sample.pdf',
      eTag: 'ASIAI44QH8DHBEXAMPLE',
      versionId: 'd41d8cd98f00b204e9800998eEXAMPLE',
      s3Throttled: false,
    },
    scanResultDetails: {
      scanResultStatus: 'NO_THREATS_FOUND',
      threats: null,
    },
  },
};

export const guardDutyNoThreadsFoundEvent: GuardDutyScanResultNotificationEvent =
  {
    ...baseEvent,
  };

export const guardDutyThreadsFoundEvent: GuardDutyScanResultNotificationEvent =
  {
    ...baseEvent,
    detail: {
      ...baseEvent.detail,
      scanResultDetails: {
        scanResultStatus: 'THREATS_FOUND',
        threats: [
          {
            name: 'EICAR-Test-File (not a virus)',
          },
        ],
      },
    },
  };

// export const guardDutyScanCompletedEvent: GuardDutyScanResultNotificationEvent = {
//   id: 'event-id-123',
//   source: 'aws.guardduty',
//   type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
//   time: '2025-12-15T10:00:00Z',
//   datacontenttype: 'application/json',
//   subject: 'message-subject-123',
//   traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
//   recordedtime: '2025-12-15T10:00:00Z',
//   severitynumber: 2,
//   data: {
//     senderId: 'sender-123',
//     messageReference: 'msg-ref-123',
//     resourceId: 'f5524783-e5d7-473e-b2a0-29582ff231da',
//     nhsNumber: '9991234566',
//     odsCode: 'A12345',
//   },
// };

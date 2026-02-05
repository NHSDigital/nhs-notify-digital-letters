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

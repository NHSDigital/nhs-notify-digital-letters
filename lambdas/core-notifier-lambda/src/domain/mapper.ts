import { Sender, logger } from 'utils';
import { randomUUID } from 'node:crypto';
import {
  MessageRequestRejected,
  MessageRequestSkipped,
  MessageRequestSubmitted,
  PDMResourceAvailable,
} from 'digital-letters-events';
import type { SingleMessageRequest } from 'domain/request';

const DIGITAL_LETTER_URL =
  'https://www.nhsapp.service.nhs.uk/digital-letters?letterid=';

export function mapPdmEventToSingleMessageRequest(
  pdmResourceAvailable: PDMResourceAvailable,
  sender: Sender,
): SingleMessageRequest {
  const { data } = pdmResourceAvailable;
  const { messageReference } = data;

  logger.info({
    description: 'Mapping resource available',
    messageReference,
    senderId: sender.senderId,
  });

  const request: SingleMessageRequest = {
    data: {
      type: 'Message',
      attributes: {
        routingPlanId: sender.routingConfigId!,
        messageReference,
        billingReference: sender.senderId,
        recipient: {
          nhsNumber: data.nhsNumber,
        },
        originator: {
          odsCode: data.odsCode,
        },
        personalisation: {
          digitalLetterURL: `${DIGITAL_LETTER_URL}${data.resourceId}`,
        },
      },
    },
  };
  return request;
}

export function mapPdmEventToMessageRequestSubmitted(
  pdmResourceAvailable: PDMResourceAvailable,
  sender: Sender,
  notifyId: string,
): MessageRequestSubmitted {
  const { data } = pdmResourceAvailable;
  const { messageReference } = data;

  return {
    ...pdmResourceAvailable,
    id: randomUUID(),
    time: new Date().toISOString(),
    recordedtime: new Date().toISOString(),
    type: 'uk.nhs.notify.digital.letters.messages.request.submitted.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-submitted-data.schema.json',
    source: pdmResourceAvailable.source.replace(/\/pdm$/, '/messages'),
    data: {
      messageReference,
      senderId: sender.senderId,
      notifyId,
      messageUri: `${DIGITAL_LETTER_URL}${data.resourceId}`,
    },
  };
}

export function mapPdmEventToMessageRequestSkipped(
  pdmResourceAvailable: PDMResourceAvailable,
  sender: Sender,
): MessageRequestSkipped {
  const { data } = pdmResourceAvailable;
  const { messageReference } = data;

  return {
    ...pdmResourceAvailable,
    id: randomUUID(),
    time: new Date().toISOString(),
    recordedtime: new Date().toISOString(),
    type: 'uk.nhs.notify.digital.letters.messages.request.skipped.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-skipped-data.schema.json',
    source: pdmResourceAvailable.source.replace(/\/pdm$/, '/messages'),
    data: {
      messageReference,
      senderId: sender.senderId,
    },
  };
}

export function mapPdmEventToMessageRequestRejected(
  pdmResourceAvailable: PDMResourceAvailable,
  sender: Sender,
  notifyFailureCode: string,
): MessageRequestRejected {
  const { data } = pdmResourceAvailable;
  const { messageReference } = data;

  return {
    ...pdmResourceAvailable,
    id: randomUUID(),
    time: new Date().toISOString(),
    recordedtime: new Date().toISOString(),
    type: 'uk.nhs.notify.digital.letters.messages.request.rejected.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-rejected-data.schema.json',
    source: pdmResourceAvailable.source.replace(/\/pdm$/, '/messages'),
    data: {
      messageReference,
      senderId: sender.senderId,
      failureCode: notifyFailureCode,
      messageUri: `${DIGITAL_LETTER_URL}${data.resourceId}`,
    },
  };
}

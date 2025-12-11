import { logger, Sender } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import type { SingleMessageRequest } from 'domain/request';

export function mapQueueToRequest(
  pdmResourceAvailable: PDMResourceAvailable,
  sender: Sender,
): SingleMessageRequest {
  const data = pdmResourceAvailable.data;
  const messageReference = data.messageReference;

  logger.info(`Mapping resource available with reference: ${messageReference} for sender: ${sender.senderId}`);

  const request: SingleMessageRequest = {
    data: {
      type: 'Message',
      attributes: {
        sender.routingConfigId!,
        messageReference,
        billingReference,
        recipient: {
          nhsNumber: data.nhsNumber,
        },
        originator: {
          odsCode: data.odsCode;
        },
        personalisation: {
          digitalLetterURL: `https://www.nhsapp.service.nhs.uk/digital-letters?letterid=${data.resourceId}`,
        }
      },
    },
  };
  return request;
}

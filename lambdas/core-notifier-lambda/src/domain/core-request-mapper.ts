import { PDMResourceAvailable } from 'digital-letters-events';
import { Sender, logger } from 'utils';
import type { SingleMessageRequest } from 'domain/request';
import { buildNhsAppResourceUrl } from 'domain/utils';

export class CoreRequestMapper {
  private readonly nhsAppBaseUrl: string;

  constructor(nhsAppBaseUrl: string) {
    this.nhsAppBaseUrl = nhsAppBaseUrl;
  }

  public mapPdmEventToSingleMessageRequest(
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
          messageReference: `${sender.senderId}_${messageReference}`,
          billingReference: sender.senderId,
          recipient: {
            nhsNumber: data.nhsNumber,
          },
          originator: {
            odsCode: data.odsCode,
          },
          personalisation: {
            digitalLetterURL: buildNhsAppResourceUrl(
              this.nhsAppBaseUrl,
              data.resourceId,
            ),
          },
        },
      },
    };
    return request;
  }
}

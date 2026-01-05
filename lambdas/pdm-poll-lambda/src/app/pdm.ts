import { IPdmClient, Logger } from 'utils';

export type PdmAvailability = 'available' | 'unavailable';

export type PdmPollResult = {
  pdmAvailability: PdmAvailability;
  nhsNumber: string;
  odsCode: string;
};

export interface PdmDependencies {
  pdmClient: IPdmClient;
  logger: Logger;
}

export class Pdm {
  private readonly pdmClient: IPdmClient;

  private readonly logger: Logger;

  constructor(config: PdmDependencies) {
    if (!config.pdmClient) {
      throw new Error('pdmClient has not been specified');
    }
    if (!config.logger) {
      throw new Error('logger has not been provided');
    }

    this.pdmClient = config.pdmClient;
    this.logger = config.logger;
  }

  async poll(item: any): Promise<PdmPollResult> {
    try {
      this.logger.info(item);

      const response = await this.pdmClient.getDocumentReference(
        item.data.resourceId,
        item.data.messageReference,
      );

      this.logger.info(response);

      const { data } = response.content[0].attachment;
      const nhsNumber = response.subject.identifier.value;
      const odsCode = response.author.find(
        (author) =>
          author.identifier.system ===
          'https://fhir.nhs.uk/Id/ods-organization-code',
      )?.identifier.value;

      if (!odsCode) {
        throw new Error('No ODS organization code found');
      }

      return {
        pdmAvailability: data ? 'available' : 'unavailable',
        nhsNumber,
        odsCode,
      };
    } catch (error) {
      this.logger.error({
        description: 'Error getting document resource from PDM',
        err: error,
      });

      throw error;
    }
  }
}

import { IPdmClient, Logger } from 'utils';

export type PdmOutcome = 'available' | 'unavailable';

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

  async poll(item: any): Promise<PdmOutcome> {
    try {
      this.logger.info(item);

      const requestId = crypto.randomUUID();

      const response = await this.pdmClient.getDocumentReference(
        item.data.resourceId,
        requestId,
        item.id,
      );

      this.logger.info(response);

      if (response.content[0].attachment.data) {
        return 'available';
      }
      return 'unavailable';
    } catch (error) {
      this.logger.error({
        description: 'Error getting document resource from PDM',
        err: error,
      });

      throw error;
    }
  }
}

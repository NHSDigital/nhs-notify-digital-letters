import { Logger } from 'utils';

export type PdmOutcome = 'available' | 'unavailable';

export interface PdmDependencies {
  pdmUrl: string;
  logger: Logger;
}

export class Pdm {
  private readonly pdmUrl: string;

  private readonly logger: Logger;

  constructor(config: PdmDependencies) {
    if (!config.pdmUrl) {
      throw new Error('pdmUrl has not been specified');
    }
    if (!config.logger) {
      throw new Error('logger has not been provided');
    }

    this.pdmUrl = config.pdmUrl;
    this.logger = config.logger;
  }

  async poll(item: any): Promise<PdmOutcome> {
    try {
      this.logger.info(item);
      if (item.data.messageReference === 'ref1') {
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

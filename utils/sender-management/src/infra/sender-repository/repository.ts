import { ParameterNotFound } from '@aws-sdk/client-ssm';
import { $Sender, IParameterStore, Logger, Sender } from 'utils';
import { Config } from '../../config/config';
import { ISenderRepository } from '../interfaces';

export type Dependencies = {
  config: Config;
  parameterStore: IParameterStore;
  logger: Logger;
};

export class SenderRepository implements ISenderRepository {
  private readonly config: Config;

  private readonly parameterStore: IParameterStore;

  private readonly logger: Logger;

  constructor({ config, logger, parameterStore }: Dependencies) {
    this.config = config;
    this.parameterStore = parameterStore;
    this.logger = logger;
  }

  async putSender(sender: Sender): Promise<void> {
    await this.parameterStore.addParameter(
      this.getParameterName(sender.senderId),
      JSON.stringify(sender),
    );
  }

  async getSender(id: string): Promise<Sender | null> {
    try {
      const parameter = await this.parameterStore.getParameter(
        this.getParameterName(id),
      );

      if (!parameter?.Value) {
        return null;
      }

      return this.parseSenderParameter(parameter.Value);
    } catch (error) {
      if (error instanceof ParameterNotFound) {
        this.logger.info({ description: `Parameter not found for ID ${id}` });
        return null;
      }

      throw error;
    }
  }

  async deleteSender(id: string): Promise<void> {
    try {
      await this.parameterStore.deleteParameter(this.getParameterName(id));
    } catch (error) {
      if (!(error instanceof ParameterNotFound)) {
        throw error;
      }
    }
  }

  private get parameterPathPrefix(): string {
    return `/dl/${this.config.environment}/senders/`;
  }

  private getParameterName(id: string) {
    return `${this.parameterPathPrefix}${id}`;
  }

  async listSenders(options?: { skipCache?: boolean }): Promise<Sender[]> {
    const parameters = await this.parameterStore.getAllParameters(
      this.parameterPathPrefix,
      { force: options?.skipCache },
    );

    return parameters.flatMap(
      ({ Value }) => this.parseSenderParameter(Value) ?? [],
    );
  }

  private parseSenderParameter(value: string | undefined): Sender | null {
    if (!value) {
      return null;
    }

    try {
      const senderJson: unknown = JSON.parse(value);

      return $Sender.parse(senderJson);
    } catch (error) {
      this.logger.error({
        description: 'Malformed sender found',
        value,
        err: error,
      });
    }

    return null;
  }
}

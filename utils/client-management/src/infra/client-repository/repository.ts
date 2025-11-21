import { ParameterNotFound } from '@aws-sdk/client-ssm';
import { Client, $Client } from 'utils';
import { IParameterStore } from 'utils';
import { ContextLogger, createLogger } from '@comms/util-logger';
import { ConflictException } from '../../domain/exceptions';
import { Config } from '../../config/config';
import { IClientRepository } from '../interfaces';

export type Dependencies = {
  config: Config;
  parameterStore: IParameterStore;
  logger?: ContextLogger;
};

export class ClientRepository implements IClientRepository {
  private config: Config;

  private parameterStore: IParameterStore;

  private logger: ContextLogger;

  constructor({
    config,
    parameterStore,
    logger = createLogger(),
  }: Dependencies) {
    this.config = config;
    this.parameterStore = parameterStore;
    this.logger = logger;
  }

  async putClient(client: Client): Promise<void> {
    await this.validatePut(client);

    await this.parameterStore.addParameter(
      this.getParameterName(client.clientId),
      JSON.stringify(client)
    );
  }

  async getClient(id: string): Promise<Client | null> {
    try {
      const parameter = await this.parameterStore.getParameter(
        this.getParameterName(id)
      );

      if (!parameter?.Value) {
        return null;
      }

      return this.parseClientParameter(parameter.Value);
    } catch (error) {
      if (error instanceof ParameterNotFound) {
        return null;
      }

      throw error;
    }
  }

  async findFirst(attributes: Partial<Client>): Promise<Client | null> {
    let client: Client | null = null;

    const clients = await this.listClients();

    client =
      clients.find((c) =>
        Object.entries(attributes).every(
          ([key, value]) => c[key as keyof Client] === value
        )
      ) || null;

    return client;
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await this.parameterStore.deleteParameter(this.getParameterName(id));
    } catch (error) {
      if (!(error instanceof ParameterNotFound)) {
        throw error;
      }
    }
  }

  async putApimClients(apimClients: { [key: string]: string }): Promise<void> {
    const apimClientsJson = JSON.stringify(apimClients);
    await this.parameterStore.addParameter(
      this.getApimClientsParameterName(),
      apimClientsJson
    );
  }

  async getApimClients(): Promise<{ [key: string]: string } | null> {
    try {
      const apimClients = await this.parameterStore.getParameter(
        this.getApimClientsParameterName()
      );
      return apimClients
        ? (JSON.parse(apimClients.Value || '{}') as { [key: string]: string })
        : {};
    } catch (error) {
      if (error instanceof ParameterNotFound) {
        return null;
      }
      throw error;
    }
  }

  private get parameterPathPrefix(): string {
    return `/comms/${this.config.environment}/clients/`;
  }

  private getParameterName(id: string) {
    return `${this.parameterPathPrefix}${id}`;
  }

  private getApimClientsParameterName() {
    return `/comms/${this.config.environment}/commsapi-apim/token`;
  }

  // * Are we mixing business logic and persistence logic here? If we switch persistence tech, we have to reimplement this validation
  private async validatePut(newClient: Client): Promise<void> {
    const uniqueConstrainedAttributes: (keyof Client)[] = [
      'name',
      'meshMailboxId',
    ];
    const nullableUniqueConstrainedAttributes: (keyof Client)[] = [
      'meshMailboxId',
    ];

    const clients = await this.listClients();

    const conflicts: (keyof Client)[] = [];

    clients.forEach((client) => {
      if (client.clientId !== newClient.clientId) {
        uniqueConstrainedAttributes.forEach((attribute) => {
          if (
            !(
              nullableUniqueConstrainedAttributes.includes(attribute) &&
              (client[attribute] === null || client[attribute] === undefined)
            ) &&
            client[attribute] === newClient[attribute]
          ) {
            conflicts.push(attribute);
          }
        });
      }
    });

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Client(s) already exists with ${conflicts
          .map((attribute) => `${attribute}=${newClient[attribute]}`)
          .join(', ')}.`
      );
    }
  }

  async listClients(options?: { skipCache?: boolean }): Promise<Client[]> {
    const parameters = await this.parameterStore.getAllParameters(
      this.parameterPathPrefix,
      { force: options?.skipCache }
    );

    return parameters.flatMap(
      ({ Value }) => this.parseClientParameter(Value) ?? []
    );
  }

  private parseClientParameter(value: string | undefined): Client | null {
    if (!value) {
      return null;
    }

    try {
      const clientJson: unknown = JSON.parse(value);

      return $Client.parse(clientJson);
    } catch (err) {
      this.logger.error({
        description: 'Malformed client found',
        value,
        err,
      });
    }

    return null;
  }
}

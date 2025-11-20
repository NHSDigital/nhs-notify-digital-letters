import {
  ClientMetadata,
  ClientRfrOverrideCodes,
  $ClientRfrOverrideCodes,
} from 'utils';
import { ParameterNotFound, ParameterType } from '@aws-sdk/client-ssm';
import { IParameterStore } from '@comms/util-aws';
import { ContextLogger, createLogger } from '@comms/util-logger';
import type { Config } from '../../config/config';
import type { MetadataIndex, IMetadataRepository } from '../interfaces';
import type { Domain } from '../../domain';

export type Dependencies = {
  config: Config;
  domain: Domain;
  parameterStore: IParameterStore;
  logger?: ContextLogger;
};

export class MetadataRepository implements IMetadataRepository {
  private config: Config;

  private domain: Domain;

  private parameterStore: IParameterStore;

  private logger: ContextLogger;

  constructor({
    config,
    domain,
    parameterStore,
    logger = createLogger(),
  }: Dependencies) {
    this.config = config;
    this.domain = domain;
    this.parameterStore = parameterStore;
    this.logger = logger;
  }

  async putMetadata(metadata: ClientMetadata): Promise<void> {
    const parameterName = this.getParameterName(metadata);

    await this.parameterStore.addParameter(
      parameterName,
      metadata.value,
      ParameterType.SECURE_STRING,
      true
    );
  }

  async getMetadata(metadata: MetadataIndex): Promise<ClientMetadata | null> {
    const parameterName = this.getParameterName(metadata);

    try {
      const parameter = await this.parameterStore.getParameter(parameterName);

      if (!parameter?.Value) {
        return null;
      }

      const commonArgs = {
        clientId: metadata.clientId,
        provider: metadata.provider,
        type: metadata.type,
        value: parameter.Value,
      } satisfies Partial<ClientMetadata>;

      return this.domain.metadata.createMetadata(
        metadata.scope === 'campaign-metadata'
          ? {
              ...commonArgs,
              campaignId: metadata.campaignId,
              scope: metadata.scope,
            }
          : {
              ...commonArgs,
              scope: metadata.scope,
            }
      );
    } catch (error) {
      if (error instanceof ParameterNotFound) {
        return null;
      }
      throw error;
    }
  }

  async listMetadata(id: string): Promise<ClientMetadata[]> {
    const parameterPrefix = this.getParameterPrefix(id);

    const parameters = await this.parameterStore.getAllParameters(
      parameterPrefix,
      {
        recursive: true,
      }
    );

    return parameters.flatMap((parameter) => {
      if (!parameter.Name || !parameter.Value) return [];

      const index = this.getMetadataIndex(parameter.Name);

      if (!index) return [];

      const commonArgs = {
        clientId: index.clientId,
        provider: index.provider,
        type: index.type,
        value: parameter.Value,
      } satisfies Partial<ClientMetadata>;

      return [
        this.domain.metadata.createMetadata(
          index.scope === 'campaign-metadata'
            ? {
                ...commonArgs,
                campaignId: index.campaignId,
                scope: index.scope,
              }
            : {
                ...commonArgs,
                scope: index.scope,
              }
        ),
      ];
    });
  }

  async deleteMetadata(metadata: MetadataIndex): Promise<void> {
    const parameterName = this.getParameterName(metadata);

    try {
      await this.parameterStore.deleteParameter(parameterName);
    } catch (error) {
      if (!(error instanceof ParameterNotFound)) {
        throw error;
      }
    }
  }

  async getClientRfrOverrideCodes(
    clientId: string
  ): Promise<ClientRfrOverrideCodes | undefined> {
    const rfrOverrideCodesMetadata = await this.getMetadata({
      clientId,
      scope: 'client-metadata',
      type: 'codes',
      provider: 'rfr-override',
    });

    if (rfrOverrideCodesMetadata == null) {
      return undefined;
    }

    return this.parseClientRfrOverrideCodes(rfrOverrideCodesMetadata.value);
  }

  private parseClientRfrOverrideCodes(
    value: string
  ): ClientRfrOverrideCodes | undefined {
    try {
      const rfrOverrideCodesJson = JSON.parse(value);

      return $ClientRfrOverrideCodes.parse(rfrOverrideCodesJson);
    } catch (err) {
      this.logger.error({
        description: 'Malformed Client RFR Override Codes found',
        value,
        err,
      });
    }

    return undefined;
  }

  private get parameterPathPrefix(): string {
    return `/comms/${this.config.environment}/clients/`;
  }

  private getMetadataIndex(path: string): MetadataIndex | null {
    return this.domain.metadata.parseMetadataIndex(path);
  }

  private getParameterPrefix(clientId: string) {
    return `${this.parameterPathPrefix}${clientId}/`;
  }

  private getParameterName(metadata: MetadataIndex) {
    return metadata.scope === 'client-metadata'
      ? `${this.parameterPathPrefix}${metadata.clientId}/${metadata.scope}/${metadata.provider}/${metadata.type}`
      : `${this.parameterPathPrefix}${metadata.clientId}/${metadata.scope}/${metadata.campaignId}/${metadata.provider}/${metadata.type}`;
  }
}

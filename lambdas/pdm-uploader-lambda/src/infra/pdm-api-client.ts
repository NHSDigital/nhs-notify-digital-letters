import axios, { AxiosInstance, isAxiosError } from 'axios';
import type { Readable } from 'node:stream';
import { constants as HTTP2_CONSTANTS } from 'node:http2';
import {
  IAccessibleService,
  Logger,
  PdmResponse,
  RetryConfig,
  conditionalRetry,
} from 'utils';

export interface IAccessTokenRepository {
  getAccessToken(): Promise<string>;
}

export type Response = {
  data: Readable;
};

export interface IPdmClient {
  createDocumentReference(
    fhirRequest: string,
    requestId: string,
    correlationId?: string,
  ): Promise<PdmResponse>;
}

export class PdmClient implements IPdmClient, IAccessibleService {
  private client: AxiosInstance;

  constructor(
    private apimBaseUrl: string,
    private accessTokenRepository: IAccessTokenRepository,
    private logger: Logger,
    private backoffConfig: RetryConfig = {
      maxDelayMs: 10_000,
      intervalMs: 1000,
      exponentialRate: 2,
      maxAttempts: 10,
    },
  ) {
    this.client = axios.create({
      baseURL: this.apimBaseUrl,
    });
  }

  public async createDocumentReference(
    fhirRequest: string,
    requestId: string,
    correlationId?: string,
  ): Promise<PdmResponse> {
    try {
      return await conditionalRetry(
        async (attempt) => {
          const accessToken = await this.accessTokenRepository.getAccessToken();

          this.logger.debug({
            requestId,
            correlationId,
            description: 'Sending request',
            attempt,
          });

          const headers = {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Correlation-ID': correlationId,
            ...(accessToken === ''
              ? {}
              : {
                  Authorization: `Bearer ${accessToken}`,
                }),
          };
          const response = await this.client.post(
            '/patient-data-manager/FHIR/R4/DocumentReference',
            fhirRequest,
            { headers },
          );

          return response.data;
        },
        (err) =>
          Boolean(
            isAxiosError(err) &&
              err.response?.status ===
                HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS,
          ),
        this.backoffConfig,
      );
    } catch (error: any) {
      this.logger.error({
        description: 'Failed sending PDM request',
        requestId,
        correlationId,
        err: error,
      });

      throw error;
    }
  }

  public async isAccessible(): Promise<boolean> {
    try {
      const accessToken = await this.accessTokenRepository.getAccessToken();
      await this.client.head('/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return true;
    } catch (error: any) {
      this.logger.error({
        description: 'NHS API Unavailable',
        err: error,
      });
      return false;
    }
  }
}

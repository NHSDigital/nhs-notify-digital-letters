import axios, { AxiosInstance, isAxiosError } from 'axios';
import { constants as HTTP2_CONSTANTS } from 'node:http2';
import { Logger } from '../logger';
import { PdmResponse } from '../types';
import { RetryConfig, conditionalRetry } from '../util-retry';

export interface IAccessTokenRepository {
  getAccessToken(): Promise<string>;
}

export interface IPdmClient {
  createDocumentReference(
    fhirRequest: string,
    requestId: string,
  ): Promise<PdmResponse>;
  getDocumentReference(
    documentReferenceId: string,
    requestId: string,
  ): Promise<PdmResponse>;
}

export class PdmClient implements IPdmClient {
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
  ): Promise<PdmResponse> {
    try {
      return await conditionalRetry(
        async (attempt) => {
          const accessToken = await this.accessTokenRepository.getAccessToken();

          this.logger.debug({
            requestId,
            description: 'Sending request',
            attempt,
          });

          const headers = {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
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
        err: error,
      });

      throw error;
    }
  }

  public async getDocumentReference(
    documentReferenceId: string,
    requestId: string,
  ): Promise<PdmResponse> {
    try {
      return await conditionalRetry(
        async (attempt) => {
          const accessToken = await this.accessTokenRepository.getAccessToken();

          this.logger.debug({
            requestId,
            description: 'Sending request',
            attempt,
          });

          const headers = {
            'X-Request-ID': requestId,
            ...(accessToken === ''
              ? {}
              : {
                  Authorization: `Bearer ${accessToken}`,
                }),
          };
          const response = await this.client.get(
            `/patient-data-manager/FHIR/R4/DocumentReference/${documentReferenceId}`,
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
        err: error,
      });

      throw error;
    }
  }
}

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { defaultConfigReader } from 'utils';

export interface Config {
  mockAccessToken: string;
  accessTokenSsmPath: string;
  useNonMockToken: boolean;
  logLevel: string;
}

export const loadConfig = (): Config => {
  const mockAccessToken =
    defaultConfigReader.tryGetValue('MOCK_ACCESS_TOKEN') ||
    'mock-token-for-local-dev';
  const accessTokenSsmPath =
    defaultConfigReader.tryGetValue('ACCESS_TOKEN_SSM_PATH') ||
    '/mock/access-token';
  const useNonMockToken =
    defaultConfigReader.tryGetBoolean('USE_NON_MOCK_TOKEN') || false;
  const logLevel = defaultConfigReader.tryGetValue('LOG_LEVEL') || 'INFO';

  return {
    mockAccessToken,
    accessTokenSsmPath,
    useNonMockToken,
    logLevel,
  };
};

export class ParameterStoreService {
  readonly ssmClient: SSMClient;

  readonly cache: Map<string, { value: string; timestamp: number }> = new Map();

  readonly cacheTtl: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'eu-west-2',
    });
  }

  async getParameter(path: string): Promise<string> {
    const cached = this.cache.get(path);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTtl) {
      return cached.value;
    }

    const command = new GetParameterCommand({
      Name: path,
      WithDecryption: true,
    });

    const response = await this.ssmClient.send(command);
    const value = response.Parameter?.Value;

    if (!value) {
      throw new Error(`Parameter ${path} not found or has no value`);
    }

    this.cache.set(path, { value, timestamp: now });
    return value;
  }
}

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export interface Config {
  mockAccessToken: string;
  accessTokenSsmPath: string;
  useNonMockToken: boolean;
  logLevel: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
};

const getBoolEnv = (key: string, defaultValue: boolean): boolean => {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const loadConfig = (): Config => {
  return {
    mockAccessToken: getEnv('MOCK_ACCESS_TOKEN', 'mock-token-for-local-dev'),
    accessTokenSsmPath: getEnv('ACCESS_TOKEN_SSM_PATH', '/mock/access-token'),
    useNonMockToken: getBoolEnv('USE_NON_MOCK_TOKEN', false),
    logLevel: getEnv('LOG_LEVEL', 'INFO'),
  };
};

export class ParameterStoreService {
  private ssmClient: SSMClient;

  private cache: Map<string, { value: string; timestamp: number }> = new Map();

  private cacheTtl: number = 5 * 60 * 1000; // 5 minutes

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

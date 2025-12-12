import { defaultConfigReader } from 'utils';

export interface Config {
  mockAccessToken: string;
  accessTokenSsmPath: string;
  useNonMockToken: boolean;
  logLevel: string;
}

export const loadConfig = (): Config => {
  const mockAccessToken =
    defaultConfigReader.tryGetValue('MOCK_ACCESS_TOKEN') || 'mock-pdm-token';
  const accessTokenSsmPath =
    defaultConfigReader.tryGetValue('ACCESS_TOKEN_SSM_PATH') ||
    '/dl/main/apim/access_token';
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

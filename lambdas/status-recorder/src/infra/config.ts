import { defaultConfigReader } from 'utils';

export type Config = {
  athenaArn: string;
};

export function loadConfig(): Config {
  return {
    athenaArn: defaultConfigReader.getValue('ATHENA_ARN'),
  };
}

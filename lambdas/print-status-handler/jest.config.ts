import { baseJestConfig } from '../../jest.config.base';

const config = baseJestConfig;

config.transformIgnorePatterns = [
  'node_modules/(?!@nhsdigital/nhs-notify-event-schemas-supplier-api)',
];

export default config;

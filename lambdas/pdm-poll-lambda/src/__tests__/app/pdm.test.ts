import { mock } from 'jest-mock-extended';
import { IPdmClient, Logger } from 'utils';
import { Pdm, PdmDependencies } from 'app/pdm';
import { pdmResourceSubmittedEvent } from '__tests__/test-data';

const logger = mock<Logger>();
const pdmClient = mock<IPdmClient>();
const validConfig = (): PdmDependencies => ({
  pdmClient,
  logger,
});

const availableResponse = {
  resourceType: 'DocumentReference',
  id: '4c5af7c3-ca21-31b8-924b-fa526db5379b',
  meta: {
    versionId: '1',
    lastUpdated: '2025-12-10T09:00:47.068021Z',
  },
  status: 'current',
  author: [
    {
      identifier: {
        system: 'https://fhir.nhs.uk/Id/ods-organization-code',
        value: 'Y05868',
      },
    },
  ],
  subject: {
    identifier: {
      system: 'https://fhir.nhs.uk/Id/nhs-number',
      value: '9912003071',
    },
  },
  content: [
    {
      attachment: {
        contentType: 'application/pdf',
        data: 'base64-encoded-pdf',
        title: 'Dummy PDF',
      },
    },
  ],
};

describe('Pdm', () => {
  describe('constructor', () => {
    it('is created when required deps are provided', () => {
      const cfg = validConfig();
      expect(() => new Pdm(cfg)).not.toThrow();
    });

    it('throws if pdmClient is not provided', () => {
      const cfg = {
        logger,
      } as unknown as PdmDependencies;

      expect(() => new Pdm(cfg)).toThrow('pdmClient has not been specified');
    });

    it('throws if logger is not provided', () => {
      const cfg = {
        pdmClient,
      } as unknown as PdmDependencies;

      expect(() => new Pdm(cfg)).toThrow('logger has not been provided');
    });
  });
});

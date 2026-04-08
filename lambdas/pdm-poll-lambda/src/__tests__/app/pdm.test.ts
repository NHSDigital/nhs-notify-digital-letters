import { mock } from 'jest-mock-extended';
import { IPdmClient, Logger } from 'utils';
import { Pdm, PdmDependencies } from 'app/pdm';

const logger = mock<Logger>();
const pdmClient = mock<IPdmClient>();
const validConfig = (): PdmDependencies => ({
  pdmClient,
  logger,
});

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

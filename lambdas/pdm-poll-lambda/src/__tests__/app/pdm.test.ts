import { mock } from 'jest-mock-extended';
import { Logger } from 'utils';
import { Pdm, PdmDependencies } from 'app/pdm';
import { pdmResourceSubmittedEvent } from '__tests__/test-data';

const logger = mock<Logger>();
const validConfig = (): PdmDependencies => ({
  pdmUrl: 'https://example.com/pdm',
  logger,
});

describe('Pdm', () => {
  describe('constructor', () => {
    it('is created when required deps are provided', () => {
      const cfg = validConfig();
      expect(() => new Pdm(cfg)).not.toThrow();
    });

    it('throws if pdmUrl is not provided', () => {
      const cfg = {
        logger,
      } as unknown as PdmDependencies;

      expect(() => new Pdm(cfg)).toThrow('pdmUrl has not been specified');
    });

    it('throws if logger is not provided', () => {
      const cfg = {
        pdmUrl: 'https://example.com/pdm',
      } as PdmDependencies;

      expect(() => new Pdm(cfg)).toThrow('logger has not been provided');
    });
  });

  describe('poll', () => {
    it('returns available when the document is ready', async () => {
      const cfg = validConfig();
      const pdm = new Pdm(cfg);

      const result = await pdm.poll(pdmResourceSubmittedEvent);

      expect(result).toBe('available');
    });

    it('returns unavailable when the document is not ready', async () => {
      const cfg = validConfig();
      const pdm = new Pdm(cfg);

      pdmResourceSubmittedEvent.data.messageReference = 'ref2';

      const result = await pdm.poll(pdmResourceSubmittedEvent);

      expect(result).toBe('unavailable');
    });

    it('returns failed and logs error when logger.info throws', async () => {
      const cfg = validConfig();
      const thrown = new Error('logger failure');
      cfg.logger.info = jest.fn(() => {
        throw thrown;
      });

      const pdm = new Pdm(cfg);

      await expect(pdm.poll(pdmResourceSubmittedEvent)).rejects.toThrow(thrown);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error getting document resource from PDM',
          err: thrown,
        }),
      );
    });
  });
});

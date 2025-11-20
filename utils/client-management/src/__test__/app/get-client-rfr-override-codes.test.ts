import { mockDeep } from 'jest-mock-extended';
import { AppDependencies } from '../../app';
import {
  createGetClientRfrOverrideCodesCommand,
  GetClientRfrOverrideCodes,
} from '../../app/get-client-rfr-override-codes';

function setup() {
  const data = { codes: ['SCT', 'RPR', 'RDI'] };

  const mocks = mockDeep<AppDependencies>({
    infra: {
      metadataRepository: {
        getClientRfrOverrideCodes: jest.fn().mockResolvedValueOnce(data),
      },
    },
  });

  const getClientRfrOverrideCodes =
    createGetClientRfrOverrideCodesCommand(mocks);

  return { mocks, data, getClientRfrOverrideCodes };
}

describe('getClientRfrOverrideCodes', () => {
  it('retrieves the RFR overrides codes from the repository and returns it', async () => {
    const { mocks, data, getClientRfrOverrideCodes } = setup();

    const input: GetClientRfrOverrideCodes = {
      clientId: 'test_client_id',
    };

    const result = await getClientRfrOverrideCodes(input);

    expect(
      mocks.infra.metadataRepository.getClientRfrOverrideCodes
    ).toHaveBeenCalledWith(input.clientId);

    expect(result).toBe(data);
  });
});

import { Parameter, ParameterNotFound } from '@aws-sdk/client-ssm';
import { mockDeep } from 'jest-mock-extended';
import { IParameterStore } from 'utils';
import { ClientMetadata } from 'utils';
import { MetadataRepository } from '../../../infra/metadata-repository/repository';
import type { Domain } from '../../../domain';

function setup() {
  const clientId = 'fake-client-id';

  const metadata: ClientMetadata[] = [
    {
      clientId,
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'secret',
    },
    {
      clientId,
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'val2',
    },
    {
      clientId,
      scope: 'campaign-metadata',
      campaignId: 'mmr',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'val4',
    },
    {
      clientId,
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'polling_index_international_numbers',
      value: 'val5',
    },
    {
      clientId,
      scope: 'client-metadata',
      provider: 'rfr-override',
      type: 'codes',
      value: '{"codes":["SCT","RPR","RDI"]}',
    },
  ];

  const listedParameters: Parameter[] = [
    {
      Name: `/comms/env/clients/${clientId}/credentials/govuknotify/api_key`,
      Value: 'secret',
    },
    {
      Name: `/comms/env/clients/${clientId}/polling/govuknotify/polling_index`,
      Value: 'val2',
    },
    {
      Name: `/comms/env/clients/${clientId}/does/not/match/expected/pattern`,
      Value: 'val3',
    },
    {
      Name: `/comms/env/clients/${clientId}/campaign-metadata/mmr/govuknotify/api_key`,
      Value: 'val4',
    },
    {
      Name: `/comms/env/clients/${clientId}/client-metadata/govuknotify/polling_index_international_numbers`,
      Value: 'val5',
    },
    {
      Name: `/comms/env/clients/${clientId}/client-metadata/rfr-override/codes`,
      Value: '{"codes":["SCT","RPR","RDI"]}',
    },
  ];

  const data = {
    metadata,
    listedParameters,
    clientId,
  };

  const lockReleaser = jest.fn();

  const mocks = {
    config: {
      environment: 'test_environment',
    },
    parameterStore: mockDeep<IParameterStore>({
      addParameter: jest.fn(),
      getParameter: jest.fn().mockResolvedValue({ Value: 'ssm-secret' }),
      deleteParameter: jest.fn(),
      getAllParameters: jest.fn().mockResolvedValue(listedParameters),
    }),
    domain: mockDeep<Domain>({
      metadata: {
        createMetadata: jest.fn(() => metadata[0]),
        parseMetadataIndex: jest.fn(),
      },
    }),
    lockReleaser,
  };

  const repository = new MetadataRepository(mocks);

  return { mocks, data, repository };
}

describe('putCredential', () => {
  it('puts the credential data into ssm parameter store', async () => {
    const { mocks, data, repository } = setup();

    const input = data.metadata[0];

    await repository.putMetadata(input);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/client-metadata/${input.provider}/${input.type}`;

    expect(mocks.parameterStore.addParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toBeCalledWith(
      expectedName,
      input.value,
      'SecureString',
      true
    );
  });
});

describe('getClientRfrOverrideCodes', () => {
  it('gets the RFR codes data from ssm parameter store and returns it', async () => {
    const { data } = setup();

    const lockReleaser = jest.fn();
    const mocks = {
      config: {
        environment: 'test_environment',
      },
      parameterStore: mockDeep<IParameterStore>({
        getParameter: jest
          .fn()
          .mockResolvedValue({ Value: '{"codes":["SCT","RPR","RDI"]}' }),
        deleteParameter: jest.fn(),
      }),
      domain: mockDeep<Domain>({
        metadata: {
          createMetadata: jest.fn(() => data.metadata[4]),
        },
      }),
      lockReleaser,
    };

    const repository = new MetadataRepository(mocks);

    const { value: _, ...input } = data.metadata[4];

    const result = await repository.getClientRfrOverrideCodes(input.clientId);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/${input.scope}/${input.provider}/${input.type}`;

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith({
      ...input,
      value: '{"codes":["SCT","RPR","RDI"]}',
    });

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(expectedName);

    expect(result).toEqual({ codes: ['SCT', 'RPR', 'RDI'] });
  });

  it('malformed json should return undefined', async () => {
    const { data } = setup();

    const malformJsonResponse = {
      ...data.metadata[4],
      value: 'malformed JSON',
    };

    const lockReleaser = jest.fn();
    const mocks = {
      config: {
        environment: 'test_environment',
      },
      parameterStore: mockDeep<IParameterStore>({
        getParameter: jest.fn().mockResolvedValue({ Value: 'malformed JSON' }),
        deleteParameter: jest.fn(),
      }),
      domain: mockDeep<Domain>({
        metadata: {
          createMetadata: jest.fn(() => malformJsonResponse),
        },
      }),
      lockReleaser,
    };

    const repository = new MetadataRepository(mocks);

    const { value: _, ...input } = data.metadata[4];

    const result = await repository.getClientRfrOverrideCodes(input.clientId);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/${input.scope}/${input.provider}/${input.type}`;

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith({
      ...input,
      value: 'malformed JSON',
    });

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(expectedName);

    expect(result).toBeUndefined();
  });

  it('non existing metedata should return undefined', async () => {
    const { data } = setup();

    const lockReleaser = jest.fn();
    const mocks = {
      config: {
        environment: 'test_environment',
      },
      parameterStore: mockDeep<IParameterStore>({
        getParameter: jest.fn().mockResolvedValue(null),
        deleteParameter: jest.fn(),
      }),
      domain: mockDeep<Domain>({
        metadata: {
          createMetadata: jest.fn(() => data.metadata[4]),
        },
      }),
      lockReleaser,
    };

    const repository = new MetadataRepository(mocks);

    const { value: _, ...input } = data.metadata[4];

    const result = await repository.getClientRfrOverrideCodes(input.clientId);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/${input.scope}/${input.provider}/${input.type}`;

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(expectedName);

    expect(result).toBeUndefined();
  });
});

describe('getMetadata', () => {
  it('gets the credential data from ssm parameter store and returns a credential entity', async () => {
    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    const result = await repository.getMetadata(input);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/${input.scope}/${input.provider}/${input.type}`;

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith({
      ...input,
      value: 'ssm-secret',
    });

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(expectedName);

    expect(result).toBe(data.metadata[0]);
  });

  it('gets campaign scoped metadata parameter', async () => {
    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[2];

    const ssmValue = 'ssm-secret';

    mocks.domain.metadata.createMetadata.mockReturnValueOnce(data.metadata[2]);

    const result = await repository.getMetadata(input);

    const expectedName =
      input.scope === 'campaign-metadata' &&
      `/comms/${mocks.config.environment}/clients/${input.clientId}/${input.scope}/${input.campaignId}/${input.provider}/${input.type}`;

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith({
      ...input,
      value: ssmValue,
    });

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(expectedName);

    expect(result).toBe(data.metadata[2]);
  });

  it('returns null if ssm parameter store throws a ParameterNotFound exception', async () => {
    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    mocks.parameterStore.getParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} })
    );

    const result = await repository.getMetadata(input);

    expect(result).toBe(null);
  });

  it('returns null if returned ssm parameter has no Value property', async () => {
    const { mocks, data, repository } = setup();

    mocks.parameterStore.getParameter.mockResolvedValueOnce({});

    const result = await repository.getMetadata(data.metadata[0]);

    expect(result).toBe(null);
  });

  it('raises unexpected exceptions', async () => {
    expect.hasAssertions();

    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    const expected = new Error('Unexpected');

    mocks.parameterStore.getParameter.mockRejectedValueOnce(expected);

    await expect(repository.getMetadata(input)).rejects.toThrow(expected);
  });
});

describe('listMetadata', () => {
  it('returns all valid items of metadata matching the clientId', async () => {
    const { mocks, data, repository } = setup();

    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(
      data.metadata[0]
    );
    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(
      data.metadata[1]
    );
    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(null);
    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(
      data.metadata[2]
    );
    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(
      data.metadata[3]
    );
    mocks.domain.metadata.parseMetadataIndex.mockReturnValueOnce(
      data.metadata[4]
    );

    data.metadata.forEach((item) =>
      mocks.domain.metadata.createMetadata.mockReturnValueOnce(item)
    );

    const listed = await repository.listMetadata(data.clientId);

    expect(mocks.parameterStore.getAllParameters).toBeCalledTimes(1);
    expect(mocks.parameterStore.getAllParameters).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/${data.clientId}/`,
      { recursive: true }
    );

    expect(mocks.domain.metadata.parseMetadataIndex).toBeCalledTimes(6);

    expect(mocks.domain.metadata.parseMetadataIndex).toBeCalledWith(
      '/comms/env/clients/fake-client-id/credentials/govuknotify/api_key'
    );

    expect(mocks.domain.metadata.parseMetadataIndex.mock.calls).toEqual(
      data.listedParameters.map(({ Name }) => [Name])
    );

    expect(mocks.domain.metadata.createMetadata.mock.calls).toEqual(
      data.metadata.map((item) => [item])
    );

    expect(listed).toEqual(data.metadata);
  });
});

describe('deleteMetadata', () => {
  it('deletes the credential data from ssm parameter store', async () => {
    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    await repository.deleteMetadata(input);

    const expectedName = `/comms/${mocks.config.environment}/clients/${input.clientId}/client-metadata/${input.provider}/${input.type}`;

    expect(mocks.parameterStore.deleteParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.deleteParameter).toBeCalledWith(expectedName);
  });

  it('handles a ParameterNotFound exception', async () => {
    expect.hasAssertions();

    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} })
    );

    await expect(() => repository.deleteMetadata(input)).not.toThrow();
  });

  it('raises unexpected exceptions', async () => {
    expect.hasAssertions();

    const { mocks, data, repository } = setup();

    const { value: _, ...input } = data.metadata[0];

    const expected = new Error('Unexpected');

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(expected);

    await expect(repository.deleteMetadata(input)).rejects.toThrow(expected);
  });
});

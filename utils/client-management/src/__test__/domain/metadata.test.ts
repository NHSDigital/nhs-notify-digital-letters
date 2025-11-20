import {
  createMetadata,
  CreateClientMetadataParameters,
  parseMetadataIndex,
} from '../../domain/metadata';
import { MetadataIndex } from '../../infra/interfaces';

describe('createMetadata', () => {
  it('creates a client-scoped metadata entity with the given inputs', () => {
    const input: CreateClientMetadataParameters = {
      clientId: 'input_client_id',
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'topsecret',
    };

    expect(createMetadata(input)).toEqual({
      clientId: input.clientId,
      scope: input.scope,
      provider: input.provider,
      type: input.type,
      value: input.value,
    });
  });

  it('creates a campaign-scoped metadata entity with the given inputs', () => {
    const input: CreateClientMetadataParameters = {
      clientId: 'input_client_id',
      campaignId: 'mmr',
      scope: 'campaign-metadata',
      provider: 'govuknotify',
      type: 'polling_index_international_numbers',
      value: '982379827897',
    };

    expect(createMetadata(input)).toEqual({
      clientId: input.clientId,
      campaignId: input.campaignId,
      scope: input.scope,
      provider: input.provider,
      type: input.type,
      value: input.value,
    });
  });

  it('validates the scope', () => {
    const input = {
      clientId: 'input_client_id',
      provider: 'govuknotify',
      scope: 'invalidscope',
      type: 'api_key',
      value: 'topsecret',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError(
      "Failed to parse metadata index: Invalid discriminator value. Expected 'client-metadata' | 'campaign-metadata' path: scope"
    );
  });

  it('validates the provider', () => {
    const input = {
      clientId: 'input_client_id',
      campaignId: 'campaign',
      provider: 'invalid-provider',
      scope: 'campaign-metadata',
      type: 'api_key',
      value: 'topsecret',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError(
      "Failed to parse metadata index: Invalid enum value. Expected 'govuknotify' | 'rfr-override', received 'invalid-provider' path: provider"
    );
  });

  it('validates the type', () => {
    expect.hasAssertions();

    const input = {
      clientId: 'input_client_id',
      provider: 'govuknotify',
      scope: 'client-metadata',
      type: 'invalid-type',
      value: 'topsecret',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError(
      "Failed to parse metadata index: Invalid enum value. Expected 'api_key' | 'polling_index' | 'polling_index_international_numbers' | 'codes', received 'invalid-type' path: type"
    );
  });

  it('validates that campaign-scoped metadata has a campaignId', () => {
    const input = {
      clientId: 'input_client_id',
      provider: 'govuknotify',
      scope: 'campaign-metadata',
      type: 'polling_index',
      value: 'id',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError('Failed to parse metadata index: Required path: campaignId');
  });

  it('validates the value is non-empty', () => {
    const input: CreateClientMetadataParameters = {
      clientId: 'input_client_id',
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: '',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError('Metadata value not given.');
  });

  it('campaignId may not contain underscores', () => {
    const input: CreateClientMetadataParameters = {
      clientId: 'input_client_id',
      campaignId: 'snake_case',
      scope: 'campaign-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'val',
    };

    expect(() =>
      createMetadata(input as unknown as CreateClientMetadataParameters)
    ).toThrowError(
      'Failed to parse metadata index: campaignId must not contain underscores path: campaignId'
    );
  });
});

describe('parseMetadataIndex', () => {
  const validCases: [string, string, MetadataIndex][] = [
    [
      'client-scoped API key',
      '/comms/env/clients/cid2/client-metadata/govuknotify/api_key',
      {
        clientId: 'cid2',
        provider: 'govuknotify',
        scope: 'client-metadata',
        type: 'api_key',
      },
    ],
    [
      'campaign-scoped polling index',
      '/comms/env/clients/cid2/campaign-metadata/mycampaign/govuknotify/polling_index',
      {
        scope: 'campaign-metadata',
        campaignId: 'mycampaign',
        clientId: 'cid2',
        provider: 'govuknotify',
        type: 'polling_index',
      },
    ],
  ];

  it.each(validCases)(
    'returns a metadata index given a valid input path, %s',
    (_, input, expected) => {
      expect(parseMetadataIndex(input)).toEqual(expected);
    }
  );

  it.each([
    ['/comms/env/clients/client/does/not/match/expected/pattern'],
    ['/comms/env/clients/cid2/invalid_namespace/govuknotify/polling_index'],
  ])('returns null given an invalid input path %s', (input) => {
    expect(parseMetadataIndex(input)).toBeNull();
  });
});

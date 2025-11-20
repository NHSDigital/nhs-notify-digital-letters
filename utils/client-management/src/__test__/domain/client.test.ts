import { createClient, CreateClientParameters } from '../../domain/client';

const mockRandomUUID = 'test_random_uuid';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => mockRandomUUID),
}));

describe('createClient', () => {
  it('creates a client entity with maximum fields', () => {
    const input: CreateClientParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
      meshMailboxId: 'input_mesh_mailbox_id',
      allowOdsOverride: true,
      senderOdsCode: 'input_client_ods_code',
      allowAlternativeContactDetails: true,
      allowRfrOverride: true,
    };

    expect(createClient(input)).toEqual({
      clientId: input.clientId,
      name: input.name,
      meshMailboxId: input.meshMailboxId,
      allowOdsOverride: input.allowOdsOverride,
      senderOdsCode: input.senderOdsCode,
      allowAlternativeContactDetails: input.allowAlternativeContactDetails,
      allowRfrOverride: input.allowRfrOverride,
    });
  });

  it('creates a client entity with minimum fields', () => {
    const input: CreateClientParameters = {
      name: 'input_client_name',
      meshMailboxId: 'input_mesh_mailbox_id',
      senderOdsCode: 'test_ods_code',
    };

    expect(createClient(input)).toEqual({
      clientId: mockRandomUUID,
      name: input.name,
      meshMailboxId: input.meshMailboxId,
      senderOdsCode: 'test_ods_code',
    });
  });
});

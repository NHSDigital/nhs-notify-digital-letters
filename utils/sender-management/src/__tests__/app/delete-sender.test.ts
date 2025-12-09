import { mockDeep } from 'jest-mock-extended';
import { AppDependencies, createApp } from '../../app';
import { DeleteSenderCommandParameters } from '../../app/delete-sender';

function setup() {
  const mocks = mockDeep<AppDependencies>({
    infra: {
      senderRepository: {
        deleteSender: jest.fn(),
      },
    },
  });

  return mocks;
}

describe('deleteSender', () => {
  it('deletes the sender from the sender repository by id', async () => {
    const mocks = setup();

    const app = createApp(mocks);

    const input: DeleteSenderCommandParameters = { senderId: 'input_id' };

    await app.deleteSender(input);

    expect(mocks.infra.senderRepository.deleteSender).toHaveBeenCalledWith(
      input.senderId,
    );
  });
});

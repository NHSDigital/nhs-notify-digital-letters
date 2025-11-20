import { $Sender } from 'validators';

describe('Sender Validator', () => {
  it('should validate a correct Sender object with senderId as uuid', () => {
    const validSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(validSender)).not.toThrow();
  });

  it('should validate a correct Sender object with senderId as non-uuid string', () => {
    const validSender = {
      senderId: 'testSender5',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(validSender)).not.toThrow();
  });

  it('should throw an error when senderId has spaces', () => {
    const invalidSender = {
      senderId: 'Spaces are invalid',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when senderId has / as this is used for organisation of data in SSM', () => {
    const invalidSender = {
      senderId: 'Character/',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when senderId is missing', () => {
    const invalidSender = {
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when senderName is missing', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when meshMailboxSenderId is missing', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when meshMailboxReportsId is missing', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when fallbackWaitTimeSeconds is missing', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when routingConfigId is missing', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: 300,
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when fallbackWaitTimeSeconds has wrong type', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: '300',
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });

  it('should throw an error when fallbackWaitTimeSeconds is negative', () => {
    const invalidSender = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      senderName: 'Test Sender',
      meshMailboxSenderId: 'SENDER123',
      meshMailboxReportsId: 'REPORTS123',
      fallbackWaitTimeSeconds: -300,
      routingConfigId: 'ROUTE123',
    };

    expect(() => $Sender.parse(invalidSender)).toThrow();
  });
});

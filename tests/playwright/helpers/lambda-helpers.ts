import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'eu-west-2',
});

async function invokeLambda(
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // Async invocation
      Payload: payload ? JSON.stringify(payload) : undefined,
    }),
  );
}

async function invokeLambdaSync<T = unknown>(
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<T | undefined> {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse', // Sync invocation
      Payload: payload ? JSON.stringify(payload) : undefined,
    }),
  );

  if (response.Payload) {
    const payloadString = new TextDecoder().decode(response.Payload);
    return JSON.parse(payloadString) as T;
  }

  return undefined;
}

export { invokeLambda, invokeLambdaSync };

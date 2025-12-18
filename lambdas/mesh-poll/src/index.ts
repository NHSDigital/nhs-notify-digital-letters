// Replace me with the actual code for your Lambda function
import { Handler } from 'aws-lambda';

export const handler: Handler = async (event) => {
  // eslint-disable-next-line no-console
  console.log('Received event:', event);
  return {
    statusCode: 200,
    body: 'Event logged',
  };
};

export default handler;

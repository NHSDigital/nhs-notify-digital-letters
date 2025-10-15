import { createHandler } from 'apis/sqs-trigger-lambda';
import { createContainer } from 'container';

export default createHandler(createContainer());

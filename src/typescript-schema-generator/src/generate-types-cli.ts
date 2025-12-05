/* eslint-disable no-console */

import { generateTypes } from 'generate-types';

generateTypes().catch((error) => {
  console.error('Error generating types:', error);
  throw error;
});

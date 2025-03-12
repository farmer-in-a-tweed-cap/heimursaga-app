import * as dotenv from 'dotenv';

import { getEnvFilePath } from '@/lib/utils';

import { app } from './app';

// import env variables
dotenv.config({ path: getEnvFilePath() });

// run the app
app();

// handle exceptions
process.on('uncaughtException', (e) => {
  console.log('uncaughtException', e);
});

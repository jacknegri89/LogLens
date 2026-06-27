import { createApp } from './app';
import { env } from './config/env';

/**
 * Entry point: build the app and start listening for HTTP requests.
 * This is the only file that binds to a network port.
 */
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`LogLens server running at http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

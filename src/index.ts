import { loadConfig } from './config/env';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildApp(config);

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });

    const shutdown = async () => {
      app.log.info('Shutting down...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();

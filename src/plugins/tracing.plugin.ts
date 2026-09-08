import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const tracingPlugin: FastifyPluginAsync = async (fastify) => {
  if (!fastify.config.otelEndpoint) {
    fastify.log.info('OpenTelemetry exporter disabled (no OTEL_EXPORTER_OTLP_ENDPOINT)');
    return;
  }

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import(
    '@opentelemetry/auto-instrumentations-node'
  );
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

  const sdk = new NodeSDK({
    serviceName: fastify.config.serviceName,
    traceExporter: new OTLPTraceExporter({ url: fastify.config.otelEndpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
  fastify.addHook('onClose', async () => {
    await sdk.shutdown();
  });
};

export default fp(tracingPlugin, { name: 'tracing', dependencies: ['config'] });

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Produktion: JSON (wird von pm2 / log-aggregatoren gelesen)
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

export default logger;

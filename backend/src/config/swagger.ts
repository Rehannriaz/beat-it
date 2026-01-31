import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hamburg Hackathon API',
      version: '1.0.0',
      description: 'API documentation for the Hamburg Hackathon project',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Something went wrong',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded'],
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-31T10:00:00.000Z',
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                  example: 'connected',
                },
              },
            },
          },
        },
        Song: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Example Song' },
            artist: { type: 'string', example: 'Example Artist', nullable: true },
            duration: { type: 'number', example: 120.5, nullable: true },
            bpm: { type: 'integer', example: 128, nullable: true },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'], example: 'medium' },
            fileUrl: { type: 'string', format: 'uri', example: 'https://storage.supabase.co/...' },
            filePath: { type: 'string', example: '1706712000000-song.mp3' },
            pattern: { $ref: '#/components/schemas/GamePattern', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        GamePattern: {
          type: 'object',
          properties: {
            version: { type: 'string', example: '1.0' },
            metadata: { $ref: '#/components/schemas/PatternMetadata' },
            settings: { $ref: '#/components/schemas/PatternSettings' },
            tiles: {
              type: 'array',
              items: { $ref: '#/components/schemas/PatternTile' },
            },
          },
        },
        PatternMetadata: {
          type: 'object',
          properties: {
            songId: { type: 'string' },
            songTitle: { type: 'string' },
            artist: { type: 'string' },
            duration: { type: 'number' },
            bpm: { type: 'integer' },
            timeSignature: { type: 'string', example: '4/4' },
            difficulty: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            generatorVersion: { type: 'string' },
          },
        },
        PatternSettings: {
          type: 'object',
          properties: {
            laneCount: { type: 'integer', example: 4 },
            hitZoneY: { type: 'integer', example: 85 },
            hitTolerance: { type: 'integer', example: 12 },
            tileSpeed: { type: 'number', example: 0.4 },
            spawnOffset: { type: 'number', example: 2.0 },
            playbackSpeed: { type: 'number', example: 1.0 },
          },
        },
        PatternTile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            time: { type: 'number', description: 'Time in seconds when tile should be hit' },
            lane: { type: 'integer', minimum: 0, maximum: 3 },
            type: { type: 'string', enum: ['normal', 'hold', 'rapid'] },
            beatStrength: { type: 'number', minimum: 0, maximum: 1 },
            holdDuration: { type: 'number', description: 'Duration for hold tiles' },
            rapidCount: { type: 'integer', description: 'Number of taps for rapid tiles' },
            rapidInterval: { type: 'number', description: 'Interval between rapid taps' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

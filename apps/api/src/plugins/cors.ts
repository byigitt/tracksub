import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env.ts';

// fastify-plugin sarmalı: encapsulation'u kapatır, decorator'lar üst scope'a sızar.
const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
};

export default fp(corsPlugin, { name: 'cors' });

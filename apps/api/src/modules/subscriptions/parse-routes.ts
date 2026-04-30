import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { schema } from '../../db/client.ts';
import { features } from '../../env.ts';
import { parseSubscriptionsFromText } from '../../lib/fal-llm.ts';
import { computeNextBilling, type Period } from '../../lib/period.ts';
import {
  candidateListSchema,
  fromCandidateSchema,
  pasteParseSchema,
  type Candidate,
} from '../../lib/schemas.ts';

const subscriptionFromCandidate = (
  userId: string,
  c: Candidate,
  source: 'paste' | 'gmail' = 'paste',
) => {
  const startedAt = new Date();
  const next =
    c.nextBillingDate && !Number.isNaN(new Date(c.nextBillingDate).getTime())
      ? new Date(c.nextBillingDate)
      : computeNextBilling(startedAt, c.period as Period, c.customPeriodDays ?? null);
  return {
    id: randomUUID(),
    userId,
    name: c.name,
    vendor: c.vendor ?? null,
    amount: c.amount.toFixed(2),
    currency: c.currency,
    period: c.period,
    customPeriodDays: c.customPeriodDays ?? null,
    status: 'active' as const,
    startedAt,
    nextBillingAt: next,
    notes: c.evidence ? `AI: ${c.evidence}` : null,
    source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const parseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.session) return reply.status(401).send({ error: 'unauthorized' });
  });

  // POST /api/subscriptions/parse — text → candidates
  app.post('/subscriptions/parse', async (request, reply) => {
    if (!features.ai) {
      return reply.status(503).send({ error: 'ai disabled (FAL_KEY missing)' });
    }
    const userId = request.session!.user.id;
    const parsed = pasteParseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation', issues: parsed.error.issues });
    }

    const jobId = randomUUID();
    await app.db.insert(schema.pasteParseJob).values({
      id: jobId,
      userId,
      inputText: parsed.data.text,
      status: 'pending',
      createdAt: new Date(),
    });

    const result = await parseSubscriptionsFromText(parsed.data.text, request.log);
    if (result.error) {
      await app.db
        .update(schema.pasteParseJob)
        .set({ status: 'error', error: result.error })
        .where(eq(schema.pasteParseJob.id, jobId));
      return reply.status(502).send({ error: result.error, jobId });
    }
    await app.db
      .update(schema.pasteParseJob)
      .set({ status: 'done', candidatesJson: result.candidates })
      .where(eq(schema.pasteParseJob.id, jobId));

    return { jobId, candidates: result.candidates };
  });

  // GET /api/subscriptions/parse/:jobId — fetch a stored job (debug + page reload)
  app.get<{ Params: { jobId: string } }>('/subscriptions/parse/:jobId', async (request, reply) => {
    const userId = request.session!.user.id;
    const [row] = await app.db
      .select()
      .from(schema.pasteParseJob)
      .where(
        and(
          eq(schema.pasteParseJob.id, request.params.jobId),
          eq(schema.pasteParseJob.userId, userId),
        ),
      )
      .limit(1);
    if (!row) return reply.status(404).send({ error: 'not found' });
    const cands = row.candidatesJson ? candidateListSchema.safeParse(row.candidatesJson) : null;
    return {
      jobId: row.id,
      status: row.status,
      candidates: cands?.success ? cands.data : [],
      error: row.error,
    };
  });

  // POST /api/subscriptions/from-candidate — confirm one candidate → real subscription
  app.post('/subscriptions/from-candidate', async (request, reply) => {
    const userId = request.session!.user.id;
    const parsed = fromCandidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation', issues: parsed.error.issues });
    }
    const [job] = await app.db
      .select()
      .from(schema.pasteParseJob)
      .where(
        and(
          eq(schema.pasteParseJob.id, parsed.data.jobId),
          eq(schema.pasteParseJob.userId, userId),
        ),
      )
      .limit(1);
    if (!job) return reply.status(404).send({ error: 'job not found' });
    if (job.status !== 'done') {
      return reply.status(409).send({ error: 'job not done' });
    }
    const list = candidateListSchema.safeParse(job.candidatesJson ?? []);
    if (!list.success) return reply.status(500).send({ error: 'candidates schema mismatch' });
    const c = list.data[parsed.data.candidateIndex];
    if (!c) return reply.status(404).send({ error: 'candidate index out of range' });

    const row = subscriptionFromCandidate(userId, c, 'paste');
    const [created] = await app.db.insert(schema.subscription).values(row).returning();
    return reply.status(201).send(created);
  });

  // POST /api/subscriptions/from-candidates — bulk confirm
  app.post('/subscriptions/from-candidates', async (request, reply) => {
    const userId = request.session!.user.id;
    const body = z
      .object({ jobId: z.string().min(1), indices: z.array(z.number().int().min(0)).min(1) })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'validation', issues: body.error.issues });
    }
    const [job] = await app.db
      .select()
      .from(schema.pasteParseJob)
      .where(
        and(eq(schema.pasteParseJob.id, body.data.jobId), eq(schema.pasteParseJob.userId, userId)),
      )
      .limit(1);
    if (!job) return reply.status(404).send({ error: 'job not found' });
    const list = candidateListSchema.safeParse(job.candidatesJson ?? []);
    if (!list.success) return reply.status(500).send({ error: 'candidates schema mismatch' });

    const rows = body.data.indices
      .map((i) => list.data[i])
      .filter((c): c is Candidate => Boolean(c))
      .map((c) => subscriptionFromCandidate(userId, c, 'paste'));
    if (rows.length === 0) return reply.status(404).send({ error: 'no valid candidates' });
    const created = await app.db.insert(schema.subscription).values(rows).returning();
    return reply.status(201).send({ items: created });
  });
};

export default parseRoutes;

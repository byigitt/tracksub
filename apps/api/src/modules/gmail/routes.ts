import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { schema } from '../../db/client.ts';
import { env, features } from '../../env.ts';
import { parseSubscriptionsFromText } from '../../lib/fal-llm.ts';
import { buildPromptFromMessages, fetchRecentMessages } from '../../lib/gmail-fetch.ts';
import { getGoogleToken, hasScope } from '../../lib/google-token.ts';
import { gmailSyncSchema } from '../../lib/schemas.ts';

const READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const gmailRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.session) return reply.status(401).send({ error: 'unauthorized' });
  });

  // GET /api/gmail/status — is google linked? has read scope? lastSyncedAt?
  app.get('/gmail/status', async (request) => {
    const userId = request.session!.user.id;
    if (!features.google) {
      return { configured: false, linked: false, canRead: false, canSend: false };
    }
    const token = await getGoogleToken(userId);
    const [link] = await app.db
      .select()
      .from(schema.gmailLink)
      .where(eq(schema.gmailLink.userId, userId))
      .limit(1);

    return {
      configured: true,
      linked: Boolean(token),
      canRead: hasScope(token?.scope ?? null, 'https://www.googleapis.com/auth/gmail.readonly'),
      canSend: hasScope(token?.scope ?? null, 'https://www.googleapis.com/auth/gmail.send'),
      scope: token?.scope ?? null,
      lastSyncedAt: link?.lastSyncedAt ?? null,
    };
  });

  // POST /api/gmail/sync — fetch recent messages → AI → return candidates (no auto-save)
  app.post('/gmail/sync', async (request, reply) => {
    const userId = request.session!.user.id;

    if (!features.google) {
      return reply.status(503).send({ error: 'google oauth not configured' });
    }
    if (!features.ai) {
      return reply.status(503).send({ error: 'ai not configured (FAL_KEY missing)' });
    }
    const token = await getGoogleToken(userId);
    if (!token) return reply.status(409).send({ error: 'gmail not linked' });
    if (!hasScope(token.scope, READ_SCOPE)) {
      return reply.status(403).send({ error: 'gmail.readonly scope missing; reconnect google' });
    }

    const parsed = gmailSyncSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation', issues: parsed.error.issues });
    }

    let messages;
    try {
      messages = await fetchRecentMessages({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        sinceDays: parsed.data.days,
      });
    } catch (err) {
      request.log.error({ err: (err as Error).message }, 'gmail fetch failed');
      return reply.status(502).send({ error: `gmail fetch: ${(err as Error).message}` });
    }

    if (messages.length === 0) {
      return { jobId: null, candidates: [], messageCount: 0 };
    }

    const prompt = buildPromptFromMessages(messages);

    // Reuse the paste-parse pipeline / job table so the same /from-candidate(s)
    // confirmation endpoints work.
    const jobId = randomUUID();
    await app.db.insert(schema.pasteParseJob).values({
      id: jobId,
      userId,
      inputText: prompt,
      status: 'pending',
      createdAt: new Date(),
    });

    const result = await parseSubscriptionsFromText(prompt, request.log);
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

    // Upsert gmail_link with lastSyncedAt.
    const [existing] = await app.db
      .select()
      .from(schema.gmailLink)
      .where(eq(schema.gmailLink.userId, userId))
      .limit(1);
    if (existing) {
      await app.db
        .update(schema.gmailLink)
        .set({ lastSyncedAt: new Date() })
        .where(eq(schema.gmailLink.id, existing.id));
    } else {
      await app.db.insert(schema.gmailLink).values({
        id: randomUUID(),
        userId,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
      });
    }

    return {
      jobId,
      candidates: result.candidates,
      messageCount: messages.length,
    };
  });

  // POST /api/gmail/disconnect — drop the linked Google account row(s)
  app.post('/gmail/disconnect', async (request) => {
    const userId = request.session!.user.id;
    await app.db
      .delete(schema.account)
      .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'google')));
    await app.db.delete(schema.gmailLink).where(eq(schema.gmailLink.userId, userId));
    return { ok: true };
  });
};

export default gmailRoutes;

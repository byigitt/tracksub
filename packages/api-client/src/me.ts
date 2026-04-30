import type { RequestFn } from './request.ts';

export type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  session: { id: string; expiresAt: string };
};

export const createMeClient = (request: RequestFn) => ({
  get: (): Promise<MeResponse> => request<MeResponse>('/api/me'),
});

export type MeClient = ReturnType<typeof createMeClient>;

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';

type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  session: { id: string; expiresAt: string };
};

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });

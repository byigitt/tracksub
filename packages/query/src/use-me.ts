import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys.ts';
import { useApiClient } from './provider.ts';

export const useMe = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me.get(),
  });
};

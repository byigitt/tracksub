import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys.ts';
import { useApiClient } from './provider.ts';

export const useReminders = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.reminders.all,
    queryFn: () => api.reminders.list(),
  });
};

export const useTestReminders = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.reminders.test(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reminders.all }),
  });
};

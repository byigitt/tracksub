import { View } from 'react-native';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };

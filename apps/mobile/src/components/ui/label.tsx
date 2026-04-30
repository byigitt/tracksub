import { Platform, Text } from 'react-native';
import { cn } from '@/lib/utils';

function Label({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Text> & { disabled?: boolean }) {
  return (
    <Text
      className={cn(
        'text-foreground text-sm font-medium',
        Platform.select({ web: 'leading-none' }),
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };

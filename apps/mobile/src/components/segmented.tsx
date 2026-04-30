import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Segmented<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <View className={cn('bg-muted/40 flex-row flex-wrap gap-1 rounded-lg p-1', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-md px-3 py-2',
              active && 'bg-background',
            )}
          >
            <Text
              className={cn(
                'text-xs font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { Platform, TextInput } from 'react-native';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'dark:bg-input/30 border-input bg-background text-foreground flex h-11 w-full min-w-0 flex-row items-center rounded-md border px-3 py-2 text-base leading-5',
        props.editable === false && 'opacity-50',
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className,
      )}
      placeholderTextColor={undefined}
      {...props}
    />
  );
}

export { Input };

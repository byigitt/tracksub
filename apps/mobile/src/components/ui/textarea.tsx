import { Platform, TextInput } from 'react-native';
import { cn } from '@/lib/utils';

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'text-foreground border-input dark:bg-input/30 flex min-h-24 w-full flex-row rounded-md border bg-transparent px-3 py-2 text-base',
        Platform.select({
          web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px]',
          native: 'placeholder:text-muted-foreground/50',
        }),
        props.editable === false && 'opacity-50',
        className,
      )}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };

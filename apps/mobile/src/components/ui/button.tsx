import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90',
          Platform.select({ web: 'hover:bg-primary/90' }),
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90',
          Platform.select({ web: 'hover:bg-destructive/90' }),
        ),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-input/50' }),
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80',
          Platform.select({ web: 'hover:bg-secondary/80' }),
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' }),
        ),
        link: '',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 gap-1.5 rounded-md px-3',
        lg: 'h-12 rounded-md px-6',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva('text-foreground text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-white',
      outline: 'group-active:text-accent-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'group-active:text-accent-foreground',
      link: 'text-primary group-active:underline',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-base',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };

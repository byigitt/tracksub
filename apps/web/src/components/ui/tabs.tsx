import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root
    data-slot="tabs"
    className={cn('flex flex-col gap-3', className)}
    {...props}
  />
);

const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="tabs-list"
    className={cn(
      'inline-flex h-9 w-fit items-center justify-center rounded-lg border bg-muted/30 p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      'hover:text-foreground',
      className,
    )}
    {...props}
  />
);

const TabsContent = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    data-slot="tabs-content"
    className={cn(
      'flex-1 outline-none data-[state=inactive]:hidden',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150',
      className,
    )}
    {...props}
  />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };

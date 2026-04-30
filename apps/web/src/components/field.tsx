import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Input> & {
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
};

// TanStack Form'un field render-prop'u ile çalışır:
//
// <form.Field name="email">
//   {(f) => (
//     <Field
//       label="E-posta"
//       type="email"
//       value={f.state.value}
//       onChange={(e) => f.handleChange(e.target.value)}
//       onBlur={f.handleBlur}
//       error={f.state.meta.errors[0]?.toString()}
//     />
//   )}
// </form.Field>
export const Field = ({ label, error, hint, id, name, className, ...input }: Props) => {
  const fieldId = id ?? name ?? `field-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId} className="text-sm">
        {label}
      </Label>
      <Input id={fieldId} name={name} aria-invalid={Boolean(error) || undefined} {...input} />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};

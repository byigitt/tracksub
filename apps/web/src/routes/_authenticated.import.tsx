import { createFileRoute, Link } from '@tanstack/react-router';

// Stub — dolduran iş Faz 5'te (AI paste-parse).
export const Route = createFileRoute('/_authenticated/import')({
  component: ImportPage,
});

function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground">
        ← Abonelikler
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">İçe aktar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Yakında: bir abonelik mailini buraya yapıştır, AI senin için ayıklasın.
      </p>
    </div>
  );
}

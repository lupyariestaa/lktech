export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <span className="text-sm">Memuat…</span>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <nav className="h-4 w-64 rounded bg-slate-100 skeleton" />
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-slate-100 skeleton" />
        <div className="h-10 w-24 rounded-lg bg-slate-100 skeleton" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-16 rounded bg-slate-100 skeleton" />
          <div className="h-5 w-48 rounded bg-slate-100 skeleton" />
          <div className="h-8 w-16 rounded bg-slate-100 skeleton" />
        </div>
      </div>
      <div className="card space-y-3 px-4 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-6 w-6 shrink-0 rounded border border-slate-200 bg-slate-100 skeleton" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-100 skeleton" />
              <div className="h-3 w-24 rounded bg-slate-100 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

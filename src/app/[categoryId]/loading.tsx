export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <nav className="h-4 w-48 rounded bg-slate-100 skeleton" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded bg-slate-100 skeleton" />
          <div className="h-4 w-40 rounded bg-slate-100 skeleton" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-slate-100 skeleton" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card flex items-center gap-3 px-4 py-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-9 w-9 rounded-lg bg-slate-100 skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-100 skeleton" />
              <div className="h-3 w-24 rounded bg-slate-100 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

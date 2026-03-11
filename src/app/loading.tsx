export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="h-8 w-48 rounded bg-slate-100 skeleton" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card flex flex-col gap-3 p-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-lg bg-slate-100 skeleton" />
              <div className="h-6 w-6 rounded bg-slate-100 skeleton" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-100 skeleton" />
              <div className="h-3 w-20 rounded bg-slate-100 skeleton" />
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

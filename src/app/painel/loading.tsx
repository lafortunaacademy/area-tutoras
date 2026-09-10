export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-48 animate-pulse rounded bg-superficie-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-superficie-2" />
        ))}
      </div>
    </div>
  );
}

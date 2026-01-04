// AI Expert Loading State

export default function AIExpertLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header skeleton */}
      <div className="text-center mb-10">
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse mx-auto" />
        <div className="h-5 w-96 bg-muted rounded mt-2 animate-pulse mx-auto" />
      </div>

      {/* Expert cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-muted rounded-xl animate-pulse" />
              <div className="flex-1">
                <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded mt-1 animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-full bg-muted rounded mt-4 animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded mt-2 animate-pulse" />
            <div className="h-10 w-full bg-muted rounded-lg mt-4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

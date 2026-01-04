// Analyze Page Loading State

export default function AnalyzeLoading() {
  return (
    <div className="min-h-screen">
      {/* Ticker placeholder */}
      <div className="w-full h-10 bg-card/50 border-b border-border/50 animate-pulse" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header skeleton */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-9 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-5 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-muted rounded-full animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-card border rounded-2xl p-6">
              <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
              <div className="h-14 bg-muted rounded-xl animate-pulse mb-4" />
              <div className="h-14 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-card border rounded-2xl p-5 space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted rounded mt-1 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Credits Loading State - Shows skeleton UI during page load

export default function CreditsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Balance Card */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-10 bg-muted rounded w-32" />
          </div>
          <div className="h-12 bg-muted rounded w-32" />
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="h-6 bg-muted rounded w-48 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-xl p-6">
            <div className="h-6 bg-muted rounded w-24 mb-2" />
            <div className="h-10 bg-muted rounded w-20 mb-4" />
            <div className="space-y-2 mb-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 bg-muted rounded w-full" />
              ))}
            </div>
            <div className="h-12 bg-muted rounded w-full" />
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="h-6 bg-muted rounded w-48 mb-4" />
      <div className="bg-card border rounded-xl p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div>
                <div className="h-4 bg-muted rounded w-32 mb-1" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
            <div className="h-5 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

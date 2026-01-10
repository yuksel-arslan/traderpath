// Alerts Loading State - Shows skeleton UI during page load

export default function AlertsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-10 bg-muted rounded w-36" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-8 bg-muted rounded w-12" />
          </div>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-card border rounded-xl">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div>
                <div className="h-5 bg-muted rounded w-24 mb-1" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

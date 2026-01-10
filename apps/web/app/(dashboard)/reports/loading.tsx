// Reports Loading State - Shows skeleton UI during page load

export default function ReportsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-muted rounded w-40" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div>
                <div className="h-5 bg-muted rounded w-24 mb-1" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-3/4 mb-4" />
            <div className="flex justify-between items-center">
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

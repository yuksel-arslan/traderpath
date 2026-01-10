// Dashboard Loading State - Shows skeleton UI during page load

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-8 bg-muted rounded w-32" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border rounded-xl p-6">
          <div className="h-5 bg-muted rounded w-40 mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
        <div className="bg-card border rounded-xl p-6">
          <div className="h-5 bg-muted rounded w-40 mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-card border rounded-xl p-6">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-32 mb-1" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

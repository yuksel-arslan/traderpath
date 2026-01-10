// Admin Loading State - Shows skeleton UI during page load

export default function AdminLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-muted rounded w-48 mb-6" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-8 bg-muted rounded w-24" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-muted rounded w-24" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-10 bg-muted rounded flex-1 max-w-sm" />
            <div className="h-10 bg-muted rounded w-32" />
          </div>
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div>
                  <div className="h-4 bg-muted rounded w-40 mb-1" />
                  <div className="h-3 bg-muted rounded w-32" />
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
    </div>
  );
}

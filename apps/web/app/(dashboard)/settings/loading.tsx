// Settings Loading State - Shows skeleton UI during page load

export default function SettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-muted rounded w-32 mb-6" />

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-card border rounded-xl p-6">
          <div className="h-6 bg-muted rounded w-24 mb-4" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-muted rounded-full" />
            <div>
              <div className="h-5 bg-muted rounded w-32 mb-2" />
              <div className="h-4 bg-muted rounded w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card border rounded-xl p-6">
          <div className="h-6 bg-muted rounded w-24 mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="h-5 bg-muted rounded w-48" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-card border rounded-xl p-6">
          <div className="h-6 bg-muted rounded w-28 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-5 bg-muted rounded w-36" />
                <div className="h-6 w-12 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

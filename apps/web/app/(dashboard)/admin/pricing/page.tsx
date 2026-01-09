'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Package,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: string;
  pricePerCredit: string;
  discountPercent: number;
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
}

interface EditingPackage {
  id?: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
  isPopular: boolean;
  isActive: boolean;
}

const emptyPackage: EditingPackage = {
  name: '',
  credits: 50,
  bonusCredits: 0,
  priceUsd: 9.99,
  isPopular: false,
  isActive: true,
};

export default function AdminPricingPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editingPackage, setEditingPackage] = useState<EditingPackage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPackages = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const response = await authFetch('/api/admin/packages');

      if (response.status === 403) {
        setError('Admin access required');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPackages(data.data.packages);
      }
    } catch (err) {
      setError('Failed to fetch packages');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreate = () => {
    setEditingPackage({ ...emptyPackage });
    setIsCreating(true);
  };

  const handleEdit = (pkg: CreditPackage) => {
    setEditingPackage({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      priceUsd: parseFloat(pkg.priceUsd),
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
    });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingPackage(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editingPackage) return;
    setIsSaving(true);

    try {
      const url = isCreating ? '/api/admin/packages' : `/api/admin/packages/${editingPackage.id}`;
      const method = isCreating ? 'POST' : 'PATCH';

      const response = await authFetch(url, {
        method,
        body: JSON.stringify({
          name: editingPackage.name,
          credits: editingPackage.credits,
          bonusCredits: editingPackage.bonusCredits,
          priceUsd: editingPackage.priceUsd,
          isPopular: editingPackage.isPopular,
          isActive: editingPackage.isActive,
        }),
      });

      if (response.ok) {
        setSuccessMessage(isCreating ? 'Package created successfully' : 'Package updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        setEditingPackage(null);
        setIsCreating(false);
        fetchPackages();
      } else {
        const data = await response.json();
        setError(data.error?.message || 'Failed to save package');
      }
    } catch (err) {
      setError('Failed to save package');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const response = await authFetch(`/api/admin/packages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage('Package deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchPackages();
      }
    } catch (err) {
      setError('Failed to delete package');
      console.error(err);
    }
  };

  const handleToggleActive = async (pkg: CreditPackage) => {
    try {
      const response = await authFetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });

      if (response.ok) {
        fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !packages.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-accent rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              Credit Packages
            </h1>
            <p className="text-muted-foreground mt-1">Manage pricing and credit packages</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPackages(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Package
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Edit/Create Form */}
      {editingPackage && (
        <div className="mb-8 bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Create New Package' : 'Edit Package'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Package Name</label>
              <input
                type="text"
                value={editingPackage.name}
                onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="e.g., Starter, Popular, Pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Credits</label>
              <input
                type="number"
                min="1"
                value={editingPackage.credits}
                onChange={(e) => setEditingPackage({ ...editingPackage, credits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bonus Credits</label>
              <input
                type="number"
                min="0"
                value={editingPackage.bonusCredits}
                onChange={(e) => setEditingPackage({ ...editingPackage, bonusCredits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price (USD)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editingPackage.priceUsd}
                onChange={(e) => setEditingPackage({ ...editingPackage, priceUsd: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPackage.isPopular}
                  onChange={(e) => setEditingPackage({ ...editingPackage, isPopular: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Mark as Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPackage.isActive}
                  onChange={(e) => setEditingPackage({ ...editingPackage, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editingPackage.name || !editingPackage.credits}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Package'}
            </button>
          </div>
        </div>
      )}

      {/* Packages Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-accent/50">
            <tr>
              <th className="text-left p-4 font-medium">Package</th>
              <th className="text-left p-4 font-medium">Credits</th>
              <th className="text-left p-4 font-medium">Price</th>
              <th className="text-left p-4 font-medium">Per Credit</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No packages found. Create your first package to get started.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className={!pkg.isActive ? 'opacity-50' : ''}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pkg.name}</span>
                      {pkg.isPopular && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span>{pkg.credits}</span>
                    {pkg.bonusCredits > 0 && (
                      <span className="text-green-500 ml-1">+{pkg.bonusCredits}</span>
                    )}
                  </td>
                  <td className="p-4 font-mono">${parseFloat(pkg.priceUsd).toFixed(2)}</td>
                  <td className="p-4 font-mono text-muted-foreground">
                    ${parseFloat(pkg.pricePerCredit).toFixed(4)}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(pkg)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.isActive
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="p-2 hover:bg-accent rounded-lg transition"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-medium text-blue-500">Pricing Notes</p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>Price per credit is automatically calculated based on total credits (including bonus).</li>
              <li>Only active packages are shown to users on the pricing page.</li>
              <li>Mark a package as &quot;Popular&quot; to highlight it with a badge.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

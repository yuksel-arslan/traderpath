'use client';

import { useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  Clock
} from 'lucide-react';

interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  price: number;
  currentPrice: number;
  active: boolean;
  triggered: boolean;
  createdAt: string;
}

const MOCK_ALERTS: PriceAlert[] = [
  {
    id: '1',
    symbol: 'BTC',
    type: 'above',
    price: 100000,
    currentPrice: 95432,
    active: true,
    triggered: false,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    symbol: 'ETH',
    type: 'below',
    price: 3000,
    currentPrice: 3245,
    active: true,
    triggered: false,
    createdAt: '2024-01-14',
  },
  {
    id: '3',
    symbol: 'SOL',
    type: 'above',
    price: 150,
    currentPrice: 178,
    active: false,
    triggered: true,
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    symbol: 'DOGE',
    type: 'above',
    price: 0.15,
    currentPrice: 0.12,
    active: true,
    triggered: false,
    createdAt: '2024-01-12',
  },
];

const SUPPORTED_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(MOCK_ALERTS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'triggered'>('all');

  // New alert form state
  const [newSymbol, setNewSymbol] = useState('BTC');
  const [newType, setNewType] = useState<'above' | 'below'>('above');
  const [newPrice, setNewPrice] = useState('');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active') return alert.active && !alert.triggered;
    if (filter === 'triggered') return alert.triggered;
    return true;
  });

  const handleCreateAlert = () => {
    if (!newPrice) return;

    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      symbol: newSymbol,
      type: newType,
      price: parseFloat(newPrice),
      currentPrice: 0, // Would come from API
      active: true,
      triggered: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAlerts([newAlert, ...alerts]);
    setShowCreateModal(false);
    setNewPrice('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      )
    );
  };

  const activeCount = alerts.filter((a) => a.active && !a.triggered).length;
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Price Alerts</h1>
          <p className="text-muted-foreground">
            Get notified when prices hit your targets
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-full">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Triggered</p>
              <p className="text-2xl font-bold">{triggeredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'triggered', label: 'Triggered' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-4 py-2 rounded-lg transition ${
              filter === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No alerts found</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all'
              ? "You haven't created any price alerts yet"
              : filter === 'active'
              ? 'No active alerts'
              : 'No triggered alerts'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 bg-card border rounded-lg ${
                alert.triggered ? 'border-amber-500/50 bg-amber-500/5' : ''
              } ${!alert.active && !alert.triggered ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Coin Icon */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {alert.symbol.charAt(0)}
                </div>

                {/* Alert Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{alert.symbol}/USDT</span>
                    <span
                      className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${
                        alert.type === 'above'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {alert.type === 'above' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {alert.type === 'above' ? 'Above' : 'Below'}
                    </span>
                    {alert.triggered && (
                      <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full">
                        TRIGGERED
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-semibold mt-1">
                    ${alert.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created {alert.createdAt}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Toggle */}
                <button
                  onClick={() => handleToggleAlert(alert.id)}
                  className={`p-2 rounded-lg transition ${
                    alert.active
                      ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={alert.active ? 'Disable alert' : 'Enable alert'}
                >
                  {alert.active ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                  title="Delete alert"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create Price Alert</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-accent rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Coin Select */}
              <div>
                <label className="block text-sm font-medium mb-2">Coin</label>
                <div className="relative">
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full px-4 py-2 bg-background border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    {SUPPORTED_COINS.map((coin) => (
                      <option key={coin} value={coin}>
                        {coin}/USDT
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Alert Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Alert When Price Goes</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewType('above')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                      newType === 'above'
                        ? 'border-green-500 bg-green-500/10 text-green-500'
                        : 'border-border hover:border-green-500/50'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Above
                  </button>
                  <button
                    onClick={() => setNewType('below')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                      newType === 'below'
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-border hover:border-red-500/50'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    Below
                  </button>
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Target Price (USD)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Credit Cost Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600">
                  Creating this alert will cost <strong>1 credit</strong>
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCreateAlert}
                disabled={!newPrice}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

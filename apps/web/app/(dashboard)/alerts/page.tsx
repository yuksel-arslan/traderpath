'use client';

import { useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  ChevronDown,
  Clock,
  Search
} from 'lucide-react';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { cn } from '../../../lib/utils';

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
  const [searchQuery, setSearchQuery] = useState('');

  // New alert form state
  const [newSymbol, setNewSymbol] = useState('BTC');
  const [newType, setNewType] = useState<'above' | 'below'>('above');
  const [newPrice, setNewPrice] = useState('');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && alert.active && !alert.triggered) ||
      (filter === 'triggered' && alert.triggered);
    return matchesSearch && matchesFilter;
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
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Compact Header ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text-logo-animate">Price Alerts</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">Get notified when prices hit your targets</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Alert
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-200 dark:border-white/10">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{alerts.length}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 text-center border border-green-200/50 dark:border-green-500/20">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{activeCount}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center border border-amber-200/50 dark:border-amber-500/20">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{triggeredCount}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Triggered</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Compact Filters ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Symbol Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'triggered', label: 'Triggered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filter === tab.id
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-card border rounded-lg gap-3 sm:gap-0 ${
                alert.triggered ? 'border-amber-500/50 bg-amber-500/5' : ''
              } ${!alert.active && !alert.triggered ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Coin Icon */}
                <img
                  src={getCoinIcon(alert.symbol)}
                  alt={alert.symbol}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_COIN_ICON;
                  }}
                />

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
              <div className="flex items-center gap-2 justify-end">
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
              <h2 className="text-xl font-bold gradient-text-logo-animate">Create Price Alert</h2>
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

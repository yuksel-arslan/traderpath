'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Database,
  Cpu,
  Activity,
  AlertTriangle,
  Sparkles,
  Save,
  Bot,
  MessageSquare,
  Layers,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';
import { TFTModelCard, TFTModel } from '../../../../components/admin/TFTModelCard';

interface GeminiModel {
  id: string;
  name: string;
  description: string;
}

interface GeminiSettings {
  model: string;
  expertModel: string;
  conciergeModel: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface TFTModelStatus {
  status: 'not_trained' | 'training' | 'trained' | 'error';
  lastTrainedAt: string | null;
  modelVersion: string | null;
  metrics: {
    validationLoss: number;
    mape: number;
    trainingSamples: number;
    epochs: number;
  } | null;
  symbols: string[];
}

interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  valLoss: number;
  eta: string;
  status: 'running' | 'completed' | 'failed';
  logs: string[];
}

export default function AdminModelsPage() {
  const [modelStatus, setModelStatus] = useState<TFTModelStatus | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL', 'BNB', 'XRP']);
  const [epochs, setEpochs] = useState(50);
  const [tradeType, setTradeType] = useState<'scalp' | 'swing' | 'position'>('swing');
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);

  // Gemini settings state
  const [geminiSettings, setGeminiSettings] = useState<GeminiSettings | null>(null);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [geminiSuccess, setGeminiSuccess] = useState<string | null>(null);

  // TFT Models state
  const [tftModels, setTftModels] = useState<TFTModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [modelActionLoading, setModelActionLoading] = useState<string | null>(null);

  const availableSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

  const tradeTypeOptions = [
    { value: 'scalp', label: 'Scalp', description: '1-4 saat, yüksek frekanslı' },
    { value: 'swing', label: 'Swing', description: '1-7 gün, orta vadeli' },
    { value: 'position', label: 'Position', description: '1-4 hafta, uzun vadeli' },
  ];

  const fetchGeminiSettings = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/gemini/settings');
      if (response.ok) {
        const data = await response.json();
        setGeminiSettings(data.data.settings);
        setAvailableModels(data.data.availableModels);
      }
    } catch (err) {
      console.error('Failed to fetch Gemini settings:', err);
    }
  }, []);

  const fetchTFTModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const params = new URLSearchParams();
      if (modelFilter !== 'all') {
        params.set('tradeType', modelFilter);
      }
      params.set('limit', '50');

      const response = await authFetch(`/api/admin/tft/models?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTftModels(data.data.models);
      }
    } catch (err) {
      console.error('Failed to fetch TFT models:', err);
    } finally {
      setModelsLoading(false);
    }
  }, [modelFilter]);

  const handleActivateModel = async (modelId: string) => {
    if (!confirm('Activate this model? It will become the active model for its trade type.')) {
      return;
    }

    setModelActionLoading(modelId);
    try {
      const response = await authFetch(`/api/admin/tft/models/${modelId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTFTModels();
        alert('Model activated successfully');
      } else {
        const data = await response.json();
        alert(`Failed to activate model: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to activate model:', err);
      alert('Failed to activate model');
    } finally {
      setModelActionLoading(null);
    }
  };

  const handleArchiveModel = async (modelId: string) => {
    if (!confirm('Archive this model? It will no longer appear in the main list.')) {
      return;
    }

    setModelActionLoading(modelId);
    try {
      const response = await authFetch(`/api/admin/tft/models/${modelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });

      if (response.ok) {
        await fetchTFTModels();
      } else {
        const data = await response.json();
        alert(`Failed to archive model: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to archive model:', err);
      alert('Failed to archive model');
    } finally {
      setModelActionLoading(null);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Delete this model permanently? This action cannot be undone.')) {
      return;
    }

    setModelActionLoading(modelId);
    try {
      const response = await authFetch(`/api/admin/tft/models/${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTFTModels();
      } else {
        const data = await response.json();
        alert(`Failed to delete model: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
      alert('Failed to delete model');
    } finally {
      setModelActionLoading(null);
    }
  };

  const saveGeminiSettings = async () => {
    if (!geminiSettings) return;

    setIsSavingGemini(true);
    setGeminiSuccess(null);

    try {
      const response = await authFetch('/api/admin/gemini/settings', {
        method: 'POST',
        body: JSON.stringify(geminiSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setGeminiSettings(data.data.settings);
        setGeminiSuccess('Settings saved successfully!');
        setTimeout(() => setGeminiSuccess(null), 3000);
      } else {
        const data = await response.json();
        alert(`Failed to save: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to save Gemini settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSavingGemini(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/tft/status');

      if (response.status === 403) {
        setError('Admin access required');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setModelStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch TFT status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    if (modelStatus?.status !== 'training') return;

    try {
      const response = await authFetch('/api/admin/tft/progress');
      if (response.ok) {
        const data = await response.json();
        setTrainingProgress(data.data);
        if (data.data.logs) {
          setTrainingLogs(data.data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch training progress:', err);
    }
  }, [modelStatus?.status]);

  useEffect(() => {
    fetchStatus();
    fetchGeminiSettings();
    fetchTFTModels();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchGeminiSettings, fetchTFTModels]);

  useEffect(() => {
    fetchTFTModels();
  }, [modelFilter, fetchTFTModels]);

  useEffect(() => {
    if (modelStatus?.status === 'training') {
      const interval = setInterval(fetchProgress, 3000);
      return () => clearInterval(interval);
    }
  }, [modelStatus?.status, fetchProgress]);

  const handleStartTraining = async () => {
    if (selectedSymbols.length === 0) {
      alert('Please select at least one symbol');
      return;
    }

    if (!confirm(`Start TFT model training with ${selectedSymbols.join(', ')}? This may take 30-60 minutes.`)) {
      return;
    }

    setIsStarting(true);
    setTrainingLogs([]);

    try {
      const response = await authFetch('/api/admin/tft/train', {
        method: 'POST',
        body: JSON.stringify({
          symbols: selectedSymbols,
          epochs,
          batchSize: 64,
          tradeType,
        }),
      });

      if (response.ok) {
        setTrainingLogs(['Training started...']);
        await fetchStatus();
      } else {
        const data = await response.json();
        alert(`Failed to start training: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to start training:', err);
      alert('Failed to start training');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTraining = async () => {
    if (!confirm('Stop training? Current progress will be lost.')) {
      return;
    }

    try {
      await authFetch('/api/admin/tft/stop', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to stop training:', err);
    }
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trained':
        return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'training':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-500';
      default:
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'trained':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'training':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            AI Model Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Train and manage TFT prediction models</p>
        </div>
        <Link
          href="/admin"
          className="px-3 py-2 text-sm border rounded-lg hover:bg-accent transition w-fit"
        >
          Back to Admin
        </Link>
      </div>

      {/* Gemini AI Settings */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Gemini AI Settings</h2>
              <p className="text-sm text-muted-foreground">Configure AI models for different features</p>
            </div>
          </div>
          {geminiSuccess && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle className="w-4 h-4" />
              {geminiSuccess}
            </div>
          )}
        </div>

        {geminiSettings && availableModels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Default Model */}
            <div className="p-4 bg-background/50 rounded-lg border">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <Brain className="w-4 h-4 text-primary" />
                Default Model
              </label>
              <select
                value={geminiSettings.model}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, model: e.target.value })}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">Used for general AI operations</p>
            </div>

            {/* AI Expert Model */}
            <div className="p-4 bg-background/50 rounded-lg border">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <Bot className="w-4 h-4 text-teal-500" />
                AI Expert Model
              </label>
              <select
                value={geminiSettings.expertModel}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, expertModel: e.target.value })}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">ARIA, NEXUS, ORACLE, SENTINEL</p>
            </div>

            {/* AI Concierge Model */}
            <div className="p-4 bg-background/50 rounded-lg border">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                AI Concierge Model
              </label>
              <select
                value={geminiSettings.conciergeModel}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, conciergeModel: e.target.value })}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">Intent detection & responses</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {geminiSettings?.updatedAt && (
              <span>Last updated: {new Date(geminiSettings.updatedAt).toLocaleString()}</span>
            )}
            {geminiSettings?.updatedBy && (
              <span className="ml-2">by {geminiSettings.updatedBy}</span>
            )}
          </div>
          <button
            onClick={saveGeminiSettings}
            disabled={isSavingGemini}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50"
          >
            {isSavingGemini ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* TFT Model Status Card */}
      <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        TFT Prediction Model
      </h2>
      <div className={`p-4 sm:p-6 rounded-lg border mb-6 sm:mb-8 ${getStatusColor(modelStatus?.status || 'not_trained')}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {getStatusIcon(modelStatus?.status || 'not_trained')}
            <div>
              <h2 className="text-xl font-bold capitalize">
                {modelStatus?.status === 'not_trained' ? 'Not Trained' : modelStatus?.status}
              </h2>
              {modelStatus?.lastTrainedAt && (
                <p className="text-sm opacity-75">
                  Last trained: {new Date(modelStatus.lastTrainedAt).toLocaleString()}
                </p>
              )}
              {modelStatus?.modelVersion && (
                <p className="text-sm opacity-75">Version: {modelStatus.modelVersion}</p>
              )}
            </div>
          </div>
          {modelStatus?.status === 'trained' && modelStatus.metrics && (
            <div className="text-right">
              <p className="text-sm">Val Loss: <span className="font-sans">{modelStatus.metrics.validationLoss.toFixed(4)}</span></p>
              <p className="text-sm">MAPE: <span className="font-sans">{modelStatus.metrics.mape.toFixed(2)}%</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Training Configuration */}
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Training Configuration
          </h3>

          {/* Symbol Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Training Symbols</label>
            <div className="flex flex-wrap gap-2">
              {availableSymbols.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => toggleSymbol(symbol)}
                  disabled={modelStatus?.status === 'training'}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedSymbols.includes(symbol)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-accent'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {symbol}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {selectedSymbols.length} symbols
            </p>
          </div>

          {/* Trade Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Trade Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tradeTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTradeType(option.value as 'scalp' | 'swing' | 'position')}
                  disabled={modelStatus?.status === 'training'}
                  className={`p-3 rounded-lg border text-left transition ${
                    tradeType === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Epochs */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Training Epochs</label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(Math.max(10, Math.min(200, parseInt(e.target.value) || 50)))}
              disabled={modelStatus?.status === 'training'}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
              min={10}
              max={200}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recommended: 50 epochs (~30-60 min)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {modelStatus?.status === 'training' ? (
              <button
                onClick={handleStopTraining}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <Square className="w-5 h-5" />
                Stop Training
              </button>
            ) : (
              <button
                onClick={handleStartTraining}
                disabled={isStarting || selectedSymbols.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isStarting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Start Training
              </button>
            )}
          </div>
        </div>

        {/* Training Progress / Metrics */}
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {modelStatus?.status === 'training' ? 'Training Progress' : 'Model Metrics'}
          </h3>

          {modelStatus?.status === 'training' && trainingProgress ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">
                    Epoch {trainingProgress.epoch} / {trainingProgress.totalEpochs}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ETA: {trainingProgress.eta}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(trainingProgress.epoch / trainingProgress.totalEpochs) * 100}%` }}
                  />
                </div>
              </div>

              {/* Loss Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Train Loss</p>
                  <p className="text-xl font-sans">{trainingProgress.loss.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Val Loss</p>
                  <p className="text-xl font-sans">{trainingProgress.valLoss.toFixed(4)}</p>
                </div>
              </div>
            </div>
          ) : modelStatus?.status === 'trained' && modelStatus.metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Validation Loss</p>
                  <p className="text-xl font-sans">{modelStatus.metrics.validationLoss.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">MAPE</p>
                  <p className="text-xl font-sans">{modelStatus.metrics.mape.toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Training Samples</p>
                  <p className="text-xl font-sans">{modelStatus.metrics.trainingSamples.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Epochs</p>
                  <p className="text-xl font-sans">{modelStatus.metrics.epochs}</p>
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Trained Symbols</p>
                <div className="flex flex-wrap gap-2">
                  {modelStatus.symbols.map(symbol => (
                    <span key={symbol} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No model trained yet</p>
              <p className="text-sm">Start training to create a prediction model</p>
            </div>
          )}
        </div>
      </div>

      {/* Training Logs */}
      {trainingLogs.length > 0 && (
        <div className="mt-6 sm:mt-8 bg-card border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Training Logs
          </h3>
          <div className="bg-black/90 rounded-lg p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto font-sans text-xs sm:text-sm text-green-400">
            {trainingLogs.map((log, i) => (
              <div key={i} className="py-0.5 break-all">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* TFT Models Library */}
      <div className="mt-8 sm:mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Trained Models Library</h2>
              <p className="text-sm text-muted-foreground">
                {tftModels.length} model{tftModels.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">All Trade Types</option>
                <option value="scalp">Scalp</option>
                <option value="swing">Swing</option>
                <option value="position">Position</option>
              </select>
            </div>
            <button
              onClick={fetchTFTModels}
              disabled={modelsLoading}
              className="p-2 border rounded-lg hover:bg-accent transition disabled:opacity-50"
              title="Refresh models"
            >
              <RefreshCw className={`w-4 h-4 ${modelsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {modelsLoading && tftModels.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tftModels.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Models Found</h3>
            <p className="text-muted-foreground mb-4">
              {modelFilter !== 'all'
                ? `No ${modelFilter} models have been trained yet.`
                : 'No models have been trained yet. Start training above to create your first model.'}
            </p>
            {modelFilter !== 'all' && (
              <button
                onClick={() => setModelFilter('all')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                Show All Models
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tftModels.map((model) => (
              <TFTModelCard
                key={model.id}
                model={model}
                onActivate={handleActivateModel}
                onArchive={handleArchiveModel}
                onDelete={handleDeleteModel}
                isLoading={modelActionLoading === model.id}
              />
            ))}
          </div>
        )}

        {/* Active Models Summary */}
        {tftModels.filter(m => m.isActive).length > 0 && (
          <div className="mt-8 p-4 sm:p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Active Models by Trade Type
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['scalp', 'swing', 'position'].map((type) => {
                const activeModel = tftModels.find(m => m.isActive && m.tradeType === type);
                return (
                  <div
                    key={type}
                    className={`p-4 rounded-lg border ${
                      activeModel
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-background/50 border-dashed'
                    }`}
                  >
                    <p className="text-sm font-medium capitalize mb-1">{type}</p>
                    {activeModel ? (
                      <>
                        <p className="font-semibold truncate">{activeModel.name}</p>
                        <p className="text-xs text-muted-foreground">v{activeModel.version}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active model</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

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
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);

  const availableSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

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
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            AI Model Management
          </h1>
          <p className="text-muted-foreground mt-1">Train and manage TFT prediction models</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 border rounded-lg hover:bg-accent transition"
        >
          Back to Admin
        </Link>
      </div>

      {/* Model Status Card */}
      <div className={`p-6 rounded-lg border mb-8 ${getStatusColor(modelStatus?.status || 'not_trained')}`}>
        <div className="flex items-center justify-between">
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
              <p className="text-sm">Val Loss: <span className="font-mono">{modelStatus.metrics.validationLoss.toFixed(4)}</span></p>
              <p className="text-sm">MAPE: <span className="font-mono">{modelStatus.metrics.mape.toFixed(2)}%</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Configuration */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
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
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
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
                  <p className="text-xl font-mono">{trainingProgress.loss.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Val Loss</p>
                  <p className="text-xl font-mono">{trainingProgress.valLoss.toFixed(4)}</p>
                </div>
              </div>
            </div>
          ) : modelStatus?.status === 'trained' && modelStatus.metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Validation Loss</p>
                  <p className="text-xl font-mono">{modelStatus.metrics.validationLoss.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">MAPE</p>
                  <p className="text-xl font-mono">{modelStatus.metrics.mape.toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Training Samples</p>
                  <p className="text-xl font-mono">{modelStatus.metrics.trainingSamples.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Epochs</p>
                  <p className="text-xl font-mono">{modelStatus.metrics.epochs}</p>
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
        <div className="mt-8 bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Training Logs
          </h3>
          <div className="bg-black/90 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm text-green-400">
            {trainingLogs.map((log, i) => (
              <div key={i} className="py-0.5">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

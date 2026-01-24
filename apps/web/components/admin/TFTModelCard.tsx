'use client';

import {
  Brain,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  FileCode,
  Play,
  Trash2,
  Archive,
  TrendingUp,
  Zap,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export interface TFTModel {
  id: string;
  name: string;
  version: string;
  tradeType: string;
  filePath: string;
  fileSize: number;
  checksum?: string;
  symbols: string[];
  epochs: number;
  batchSize: number;
  dataInterval: string;
  lookbackDays: number;
  validationLoss: number;
  mape: number;
  trainingSamples: number;
  trainingTime: number;
  hyperparameters: Record<string, any>;
  status: 'TRAINING' | 'READY' | 'ACTIVE' | 'ARCHIVED' | 'FAILED';
  isActive: boolean;
  description?: string;
  createdAt: string;
  activatedAt?: string;
}

interface TFTModelCardProps {
  model: TFTModel;
  onActivate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function TFTModelCard({ model, onActivate, onArchive, onDelete, isLoading }: TFTModelCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 border-green-500/30 text-green-500';
      case 'READY':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-500';
      case 'TRAINING':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
      case 'ARCHIVED':
        return 'bg-gray-500/10 border-gray-500/30 text-gray-500';
      case 'FAILED':
        return 'bg-red-500/10 border-red-500/30 text-red-500';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Zap className="w-4 h-4" />;
      case 'READY':
        return <CheckCircle className="w-4 h-4" />;
      case 'TRAINING':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'ARCHIVED':
        return <Archive className="w-4 h-4" />;
      case 'FAILED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTradeTypeColor = (type: string) => {
    switch (type) {
      case 'scalp':
        return 'bg-purple-500/10 text-purple-500';
      case 'swing':
        return 'bg-teal-500/10 text-teal-500';
      case 'position':
        return 'bg-orange-500/10 text-orange-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div
      className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${
        model.isActive
          ? 'border-green-500/50 bg-green-500/5 shadow-lg shadow-green-500/10'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
      }`}
    >
      {/* Active Badge */}
      {model.isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" />
          ACTIVE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{model.name}</h3>
            <p className="text-sm text-muted-foreground">v{model.version}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
          {getStatusIcon(model.status)}
          {model.status}
        </div>
      </div>

      {/* Trade Type & Symbols */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getTradeTypeColor(model.tradeType)}`}>
          {model.tradeType}
        </span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{model.dataInterval} interval</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{model.lookbackDays}d lookback</span>
      </div>

      {/* Symbols */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {model.symbols.slice(0, 5).map((symbol) => (
          <span
            key={symbol}
            className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs font-medium"
          >
            {symbol}
          </span>
        ))}
        {model.symbols.length > 5 && (
          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
            +{model.symbols.length - 5} more
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Validation Loss
          </div>
          <p className="font-mono font-semibold">{model.validationLoss.toFixed(4)}</p>
        </div>
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Cpu className="w-3.5 h-3.5" />
            MAPE
          </div>
          <p className="font-mono font-semibold">{model.mape.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Database className="w-3.5 h-3.5" />
            Samples
          </div>
          <p className="font-mono font-semibold">{model.trainingSamples.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="w-3.5 h-3.5" />
            Training Time
          </div>
          <p className="font-mono font-semibold">{formatTime(model.trainingTime)}</p>
        </div>
      </div>

      {/* File Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <FileCode className="w-3.5 h-3.5" />
        <span className="truncate flex-1" title={model.filePath}>
          {model.filePath.split('/').pop()}
        </span>
        <span>({formatFileSize(model.fileSize)})</span>
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{model.description}</p>
      )}

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground mb-4">
        <p>Created: {new Date(model.createdAt).toLocaleString()}</p>
        {model.activatedAt && <p>Activated: {new Date(model.activatedAt).toLocaleString()}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t">
        {!model.isActive && model.status === 'READY' && (
          <button
            onClick={() => onActivate(model.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Activate
          </button>
        )}
        {!model.isActive && model.status !== 'ARCHIVED' && (
          <button
            onClick={() => onArchive(model.id)}
            disabled={isLoading}
            className="px-3 py-2 border rounded-lg hover:bg-accent transition disabled:opacity-50"
            title="Archive model"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
        {!model.isActive && (
          <button
            onClick={() => onDelete(model.id)}
            disabled={isLoading}
            className="px-3 py-2 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
            title="Delete model"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {model.isActive && (
          <div className="flex-1 text-center text-sm text-green-500 font-medium">
            Currently in use for {model.tradeType} predictions
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Server-side SVG Candlestick Chart Generator
// Generates static SVG charts for email reports
// ===========================================

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartLevel {
  price: number;
  color: string;
  label: string;
  dashArray?: string;
}

interface ChartMarker {
  timestamp: number;
  label: string;
  color: string;
}

interface SVGChartOptions {
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  levels?: ChartLevel[];
  marker?: ChartMarker;
  backgroundColor?: string;
}

export function generateCandlestickSVG(
  candles: Candle[],
  options: SVGChartOptions = {}
): string {
  const {
    width = 560,
    height = 300,
    title = '',
    subtitle = '',
    levels = [],
    marker,
    backgroundColor = '#1e293b',
  } = options;

  if (!candles || candles.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${backgroundColor}" rx="8"/>
      <text x="${width / 2}" y="${height / 2}" fill="#94a3b8" text-anchor="middle" font-size="14" font-family="sans-serif">No chart data available</text>
    </svg>`;
  }

  const padding = { top: 50, right: 60, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Price range
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  levels.forEach(l => allPrices.push(l.price));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const pricePad = priceRange * 0.05;
  const yMin = minPrice - pricePad;
  const yMax = maxPrice + pricePad;

  const toY = (price: number) => padding.top + chartH - ((price - yMin) / (yMax - yMin)) * chartH;

  const candleWidth = Math.max(2, Math.min(8, (chartW / candles.length) * 0.7));
  const gap = chartW / candles.length;

  // Format price for display
  const fmtPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(6);
  };

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="8"/>`;

  // Title
  if (title) {
    svg += `<text x="${padding.left + 10}" y="22" fill="#f1f5f9" font-size="14" font-weight="bold" font-family="sans-serif">${title}</text>`;
  }
  if (subtitle) {
    svg += `<text x="${padding.left + 10}" y="38" fill="#64748b" font-size="11" font-family="sans-serif">${subtitle}</text>`;
  }

  // Grid lines (4 horizontal)
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const price = yMax - ((yMax - yMin) / 4) * i;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`;
    svg += `<text x="${width - padding.right + 5}" y="${y + 4}" fill="#64748b" font-size="9" font-family="sans-serif">$${fmtPrice(price)}</text>`;
  }

  // Candlesticks
  candles.forEach((candle, i) => {
    const x = padding.left + gap * i + gap / 2;
    const isBullish = candle.close >= candle.open;
    const color = isBullish ? '#22c55e' : '#ef4444';

    const bodyTop = toY(Math.max(candle.open, candle.close));
    const bodyBottom = toY(Math.min(candle.open, candle.close));
    const bodyH = Math.max(1, bodyBottom - bodyTop);

    // Wick
    svg += `<line x1="${x}" y1="${toY(candle.high)}" x2="${x}" y2="${toY(candle.low)}" stroke="${color}" stroke-width="1"/>`;
    // Body
    svg += `<rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyH}" fill="${color}" rx="0.5"/>`;
  });

  // Marker (analysis time or outcome time)
  if (marker) {
    const markerIdx = candles.findIndex(c => c.timestamp >= marker.timestamp);
    if (markerIdx >= 0) {
      const mx = padding.left + gap * markerIdx + gap / 2;
      svg += `<line x1="${mx}" y1="${padding.top}" x2="${mx}" y2="${padding.top + chartH}" stroke="${marker.color}" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>`;
      svg += `<text x="${mx}" y="${padding.top - 5}" fill="${marker.color}" font-size="9" text-anchor="middle" font-family="sans-serif">${marker.label}</text>`;
    }
  }

  // Price levels (Entry, SL, TP)
  levels.forEach(level => {
    const y = toY(level.price);
    if (y >= padding.top && y <= padding.top + chartH) {
      const dash = level.dashArray || '6,3';
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${level.color}" stroke-width="1.5" stroke-dasharray="${dash}" opacity="0.8"/>`;
      svg += `<text x="${padding.left + 5}" y="${y - 4}" fill="${level.color}" font-size="9" font-weight="bold" font-family="sans-serif">${level.label} $${fmtPrice(level.price)}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
}

// Convert SVG to base64 data URL for embedding in emails
export function svgToBase64DataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}


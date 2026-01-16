'use client';

import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number;
  interval?: string;
}

function TradingViewWidgetComponent({
  symbol = 'BINANCE:BTCUSDT',
  theme = 'dark',
  height = 400,
  interval = 'D',
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      save_image: true,
      hide_volume: false,
      container_id: 'tradingview_widget',
    });

    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme, interval]);

  return (
    <div className="tradingview-widget-container" style={{ height, width: '100%' }}>
      <div
        ref={container}
        id="tradingview_widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);

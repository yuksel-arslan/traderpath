'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Target,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  ChevronRight,
  Globe,
  FileText,
  AlertTriangle,
  TrendingDown,
  Lock,
  Eye,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  ChevronDown,
  Play,
  Brain,
  Sparkles,
  LineChart,
  Crosshair,
  Radar,
  ShieldAlert,
  Download,
  Mail,
  History,
  Share2,
  PieChart,
  Calendar,
  Bell,
  MessageCircle,
  Send,
  Smartphone,
  Rocket,
  Menu,
  X,
  Bot,
  Search,
  Coins,
  Gift,
  Mic
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../lib/coin-icons';
import { ANALYSIS_BUNDLES } from '../../lib/pricing-config';

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Market Pulse',
    description: 'Real-time analysis of overall market sentiment and conditions',
  },
  {
    icon: Target,
    title: 'Asset Scanner',
    description: 'Deep-dive technical analysis of specific cryptocurrencies',
  },
  {
    icon: Shield,
    title: 'Safety Check',
    description: 'Detect manipulation and whale activities before they affect you',
  },
  {
    icon: Clock,
    title: 'Timing Analysis',
    description: 'Find the optimal entry and exit points for your trades',
  },
  {
    icon: FileText,
    title: 'Trade Plan',
    description: 'Get a complete trading strategy with targets and stop-losses',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Check',
    description: 'Identify liquidation zones and avoid common trading traps',
  },
  {
    icon: CheckCircle,
    title: 'Final Verdict',
    description: 'AI-powered final recommendation with GO/WAIT/AVOID decision',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex M.',
    role: 'Day Trader',
    content: 'TraderPath helped me avoid 3 manipulation traps in just one week. The Safety Check feature is incredible.',
    rating: 5,
  },
  {
    name: 'Sarah K.',
    role: 'Crypto Investor',
    content: 'Finally, an analysis tool that explains WHY I should or shouldn\'t enter a trade. Game changer!',
    rating: 5,
  },
  {
    name: 'Michael R.',
    role: 'Swing Trader',
    content: 'The 7-step analysis gives me confidence in my trading decisions. Worth every credit.',
    rating: 5,
  },
];


const FAQS = [
  {
    question: 'What is TraderPath and how does it work?',
    answer: 'TraderPath is an AI-powered trading analysis platform that runs your chosen cryptocurrency through 7 specialized analysis steps. In about 60 seconds, you get a complete trade plan with entry points, targets, stop-losses, and a final verdict on whether to trade or wait.',
  },
  {
    question: 'Do I need to connect my exchange or wallet?',
    answer: 'No! TraderPath is purely an analysis tool. We never ask for your trading keys, wallet addresses, or exchange credentials. Your funds stay safe in your own accounts.',
  },
  {
    question: 'How accurate is the analysis?',
    answer: 'Our backtesting shows an 87% accuracy rate on trade direction predictions. However, we always recommend using our analysis as one input in your trading decisions, not as financial advice.',
  },
  {
    question: 'What cryptocurrencies can I analyze?',
    answer: 'We support 50+ major cryptocurrencies including BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, and many more. We continuously add new coins based on user demand.',
  },
  {
    question: 'How does the credit system work?',
    answer: 'You purchase credits upfront and spend them as you analyze. A full 7-step analysis costs 25 credits. You can also earn free credits daily through login bonuses, quizzes, and other activities.',
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'Yes! We offer a 7-day money-back guarantee on your first credit purchase. If TraderPath doesn\'t meet your expectations, contact support for a full refund.',
  },
];


// FAQ Accordion Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-accent/50 transition"
      >
        <span className="font-semibold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {question}
        </span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}

// CountUp Animation Component
function CountUp({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  // Format number with K suffix
  const formatDisplay = (): string => {
    if (end >= 1000) {
      const kValue = count / 1000;
      // Show clean integer when complete, otherwise show one decimal
      if (count >= end) {
        return Math.round(kValue) + 'K';
      }
      return kValue.toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  return (
    <span ref={ref}>
      {formatDisplay()}{suffix}
    </span>
  );
}

// Analysis Steps Data - Detailed information for curious users
const ANALYSIS_STEPS = [
  {
    name: 'Market Pulse',
    icon: Globe,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    subtitle: 'Understanding the Big Picture',
    description: 'Before analyzing any specific coin, we first check the overall health of the crypto market. Even the best altcoin setup can fail if Bitcoin suddenly dumps or the entire market shifts to fear mode. Market Pulse acts as your macro-level radar.',
    whatWeDo: [
      'Monitor Bitcoin dominance trends to predict altcoin season or Bitcoin season',
      'Analyze total crypto market cap momentum and direction',
      'Track the Fear & Greed Index to gauge market psychology',
      'Detect institutional money flows through on-chain data',
      'Identify correlation patterns between major assets'
    ],
    whyItMatters: 'Trading against the market trend is like swimming against the current. Market Pulse ensures you only trade when conditions are favorable.',
    example: 'If Fear & Greed shows "Extreme Fear" while BTC dominance is rising, altcoins typically underperform—we factor this into your trade decision.'
  },
  {
    name: 'Asset Scan',
    icon: BarChart3,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    subtitle: 'Deep Technical Analysis',
    description: 'This is where we dive deep into your chosen cryptocurrency. Our AI analyzes price action, volume, momentum indicators, and chart patterns across multiple timeframes to build a complete technical picture.',
    whatWeDo: [
      'Identify key support and resistance levels from historical price data',
      'Calculate RSI, MACD, Stochastic, and other momentum indicators',
      'Analyze volume profiles to confirm price movements',
      'Detect chart patterns (triangles, flags, head & shoulders, etc.)',
      'Compare 15m, 1h, 4h, and daily timeframes for confluence'
    ],
    whyItMatters: 'Technical analysis helps predict where price is likely to go next. Multiple timeframe confirmation significantly increases trade probability.',
    example: 'If ETH shows a bullish flag pattern on 4h with RSI oversold on 1h and strong support nearby, that\'s a high-probability long setup.'
  },
  {
    name: 'Safety',
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    subtitle: 'Risk & Manipulation Detection',
    description: 'The crypto market is filled with manipulation, whale games, and hidden risks. Safety Check protects your capital by detecting dangerous patterns that retail traders often miss. This step can save you from devastating losses.',
    whatWeDo: [
      'Track whale wallet movements and large holder accumulation/distribution',
      'Monitor exchange inflows (selling pressure) and outflows (accumulation)',
      'Detect wash trading and artificial volume patterns',
      'Check for unusual funding rate spikes indicating overleveraged positions',
      'Analyze social sentiment for coordinated pump & dump signals'
    ],
    whyItMatters: 'Over 70% of retail traders lose money partly due to manipulation they can\'t see. Safety Check gives you the institutional-level awareness.',
    example: 'If a coin shows massive exchange inflows while price rises, whales might be preparing to dump. We\'ll warn you before you become exit liquidity.'
  },
  {
    name: 'Timing',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    subtitle: 'Optimal Entry Window',
    description: 'Even with a great trade setup, entering at the wrong time can turn a winner into a loser. Timing Analysis finds the optimal moment to enter based on volatility patterns, funding rates, and market events.',
    whatWeDo: [
      'Analyze historical volatility to predict optimal entry windows',
      'Check funding rates to avoid entering during extreme leverage',
      'Map liquidation clusters that could trigger cascading moves',
      'Review upcoming events (unlocks, earnings, protocol updates)',
      'Calculate time-based support/resistance from previous sessions'
    ],
    whyItMatters: 'A perfectly good trade can hit stop-loss due to bad timing. Entering during low volatility periods near support dramatically improves success rate.',
    example: 'If there\'s a $50M liquidation cluster just below current price, entering long here is risky—we\'d suggest waiting for that level to be swept first.'
  },
  {
    name: 'Trade Plan',
    icon: Target,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    subtitle: 'Your Execution Strategy',
    description: 'This is where everything comes together into an actionable plan. We calculate the exact entry price, multiple take-profit targets, and a strategic stop-loss level—all optimized for the best risk/reward ratio.',
    whatWeDo: [
      'Calculate optimal entry price based on current orderbook and momentum',
      'Set TP1 (conservative), TP2 (moderate), and TP3 (aggressive) targets',
      'Place stop-loss at technical invalidation points, not arbitrary percentages',
      'Calculate position sizing suggestions based on risk percentage',
      'Determine risk/reward ratio and expected value of the trade'
    ],
    whyItMatters: 'Professional traders never enter without a plan. Having predefined exits removes emotion from trading and protects your capital.',
    example: 'Entry: $0.5420 | TP1: $0.5680 (+4.8%) | TP2: $0.5890 (+8.7%) | TP3: $0.6200 (+14.4%) | SL: $0.5180 (-4.4%) | R:R = 2.1:1'
  },
  {
    name: 'Trap Check',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    subtitle: 'Avoiding Common Pitfalls',
    description: 'Market makers and whales set traps to liquidate retail traders. Trap Check identifies these danger zones—fake breakouts, stop hunts, and manipulation patterns—so you don\'t become their target.',
    whatWeDo: [
      'Identify potential bull traps (fake breakouts above resistance)',
      'Detect bear traps (fake breakdowns below support)',
      'Map stop-loss hunting zones where liquidity clusters exist',
      'Analyze orderbook spoofing and wall manipulation',
      'Check for divergences between price action and real buying/selling'
    ],
    whyItMatters: 'Most traders get stopped out right before price moves in their direction. Trap Check helps you avoid these frustrating scenarios.',
    example: 'Price breaking above resistance with low volume and hidden sell walls = likely bull trap. We\'d warn you to wait for confirmation or avoid the trade.'
  },
  {
    name: 'Final Verdict',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    subtitle: 'The Final Decision',
    description: 'All six analysis steps are combined using our proprietary scoring algorithm to deliver a clear, actionable verdict. No more analysis paralysis—you get a straightforward recommendation backed by comprehensive data.',
    whatWeDo: [
      'Aggregate scores from all previous analysis steps',
      'Weight factors based on current market conditions',
      'Generate a confidence percentage (0-100%)',
      'Deliver clear verdict: GO (take the trade), WAIT (conditions uncertain), or AVOID (too risky)',
      'Provide a summary of the key factors behind the decision'
    ],
    whyItMatters: 'Information overload leads to bad decisions. A clear verdict with reasoning helps you act confidently and consistently.',
    example: 'VERDICT: GO (78% confidence) | Strong technicals + favorable market + no manipulation detected + optimal timing. Key risk: BTC correlation during US market hours.'
  },
];

// AI Experts Data - 4 specialized AI mentors for chat, education, and analysis review
const AI_EXPERTS = [
  {
    name: 'ARIA',
    title: 'Technical Analysis Mentor',
    icon: LineChart,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    credentials: 'AI Mentor • Technical Analysis Specialist • Chart Pattern Expert',
    description: 'Your go-to mentor for all things technical analysis. Chat with ARIA to learn about RSI, MACD, chart patterns, support/resistance levels, and multi-timeframe analysis. Ask any question and get clear, educational explanations.',
    focus: ['RSI & MACD', 'Chart Patterns', 'Support/Resistance', 'Trend Analysis']
  },
  {
    name: 'NEXUS',
    title: 'Risk Management Mentor',
    icon: Crosshair,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    credentials: 'AI Mentor • Risk Management Specialist • Position Sizing Expert',
    description: 'Your mentor for smart money management. Chat with NEXUS to learn about position sizing, risk/reward ratios, stop-loss strategies, and how to protect your capital. Perfect for beginners and experienced traders alike.',
    focus: ['Position Sizing', 'Risk/Reward', 'Stop-Loss Strategy', 'Capital Protection']
  },
  {
    name: 'ORACLE',
    title: 'On-Chain Intelligence Mentor',
    icon: Radar,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    credentials: 'AI Mentor • Blockchain Data Specialist • Whale Tracking Expert',
    description: 'Your guide to understanding on-chain data. Chat with ORACLE to learn about whale movements, exchange flows, smart money tracking, and how blockchain data can inform your trading decisions.',
    focus: ['Whale Tracking', 'Exchange Flows', 'Smart Money', 'On-Chain Metrics']
  },
  {
    name: 'SENTINEL',
    title: 'Security & Safety Mentor',
    icon: ShieldAlert,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    credentials: 'AI Mentor • Security Specialist • Scam Prevention Expert',
    description: 'Your protector in the crypto world. Chat with SENTINEL to learn about common scams, how to spot rug pulls, market manipulation tactics, and how to keep your investments safe from fraudulent projects.',
    focus: ['Scam Detection', 'Rug Pull Signs', 'Manipulation Tactics', 'Safe Trading']
  },
];

// Advanced Reporting Features Data
const REPORTING_FEATURES = [
  {
    name: 'PDF Reports',
    icon: Download,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    description: 'Download professional PDF reports with AI Expert insights and Tokenomics analysis. Perfect for record-keeping and sharing.',
    highlights: ['AI Expert comments', 'Tokenomics analysis', 'Trade plan charts', '40+ indicators']
  },
  {
    name: 'Email Delivery',
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    description: 'Get your analysis reports delivered directly to your inbox. Set up automatic delivery for scheduled analyses.',
    highlights: ['Instant delivery', 'Mobile-friendly format', 'Custom recipients', 'Digest options']
  },
  {
    name: 'Report History',
    icon: History,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Access all your past analyses anytime. Track your trading decisions and learn from historical data.',
    highlights: ['Unlimited history', 'Search & filter', 'Compare analyses', 'Export bulk data']
  },
  {
    name: 'Share & Collaborate',
    icon: Share2,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    description: 'Share your analyses with team members or trading communities. Generate shareable links with customizable permissions.',
    highlights: ['Shareable links', 'Team workspaces', 'Permission controls', 'Community sharing']
  },
  {
    name: 'Performance Analytics',
    icon: PieChart,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    description: 'Track your trading performance over time. See win rates, ROI, and identify patterns in your successful trades.',
    highlights: ['Win/loss tracking', 'ROI calculations', 'Pattern insights', 'Monthly summaries']
  },
  {
    name: 'Scheduled Reports',
    icon: Calendar,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    description: 'Set up automated analyses for your favorite coins. Wake up to fresh reports every morning.',
    highlights: ['Daily/weekly schedules', 'Multi-coin support', 'Custom timing', 'Smart alerts']
  },
];

// Alerts Features Data - Social media and messaging alerts
const ALERTS_FEATURES = [
  {
    name: 'Telegram Alerts',
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    description: 'Get instant analysis results and trade signals delivered to your Telegram. Join our channel or set up private bot notifications.',
    highlights: ['Instant notifications', 'Private bot option', 'Channel broadcasts', 'Custom filters']
  },
  {
    name: 'Discord Alerts',
    icon: MessageCircle,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    description: 'Connect with our Discord community. Receive alerts in dedicated channels and discuss trades with fellow traders.',
    highlights: ['Community channels', 'Role-based alerts', 'Discussion threads', 'Voice updates']
  },
  {
    name: 'Push Notifications',
    icon: Smartphone,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Never miss an important signal. Get push notifications directly to your mobile device for time-sensitive alerts.',
    highlights: ['Mobile alerts', 'Priority levels', 'Sound customization', 'Do not disturb']
  },
  {
    name: 'Price Alerts',
    icon: Bell,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    description: 'Set custom price alerts for any coin. Get notified when your target prices or analysis conditions are met.',
    highlights: ['Custom thresholds', 'Multi-coin tracking', 'Condition triggers', 'TP/SL monitoring']
  },
];

// Analysis Steps Grid Component (Simple version for How it Works section)
function AnalysisStepsGrid() {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ANALYSIS_STEPS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-accent/50 transition"
            >
              <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center mb-1`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-[11px] font-medium">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Features Section Component with Four Main Features
function FeaturesSection() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeExpert, setActiveExpert] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<number | null>(null);
  const [activeAlert, setActiveAlert] = useState<number | null>(null);
  const [activeConcierge, setActiveConcierge] = useState<number | null>(null);

  return (
    <>
      {/* Feature 1: 7-Step Analysis Suite */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Feature 1
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              7-Step Analysis Suite
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Complete trading analysis covering every aspect of your trade. Click any step to learn more.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            {/* Steps 1-3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ANALYSIS_STEPS.slice(0, 3).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`p-5 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ${step.border}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 ${step.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <span className={`text-xs font-medium ${step.color}`}>Step {index + 1}</span>
                    </div>
                    <h3 className="font-semibold mb-1 gradient-text-logo-animate">{step.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
            {/* Steps 4-6 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ANALYSIS_STEPS.slice(3, 6).map((step, index) => {
                const Icon = step.icon;
                const stepNumber = index + 4;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(index + 3)}
                    className={`p-5 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ${step.border}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 ${step.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <span className={`text-xs font-medium ${step.color}`}>Step {stepNumber}</span>
                    </div>
                    <h3 className="font-semibold mb-1 gradient-text-logo-animate">{step.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
            {/* Step 7 - Final Verdict (Full Width) */}
            <div className="w-full">
              {ANALYSIS_STEPS.slice(6).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(6)}
                    className="p-6 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ring-2 ring-green-500/20 border-green-500/30"
                  >
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                        <Icon className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-green-500 font-medium">Step 7</span>
                        <h3 className="font-semibold text-lg gradient-text-logo-animate">{step.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: 4 AI Experts Council */}
      <section className="py-20 bg-gradient-to-b from-purple-500/5 via-blue-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-500 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Feature 2
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">4 AI Experts Council</span>
              <Sparkles className="w-8 h-8 text-yellow-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personal AI mentors for trading education. Chat with specialized experts to learn, ask questions, and get personalized guidance on any trading topic.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AI_EXPERTS.map((expert, idx) => {
                const ExpertIcon = expert.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveExpert(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${expert.border}`}
                  >
                    <div className={`w-16 h-16 ${expert.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <ExpertIcon className={`w-8 h-8 ${expert.color}`} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-1 gradient-text-logo-animate">{expert.name}</h3>
                      <p className={`text-sm ${expert.color} font-medium mb-2`}>{expert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{expert.description.split('.')[0]}.</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Chat & Learn:</span> Ask any trading question and get instant, educational responses tailored to your level.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Analysis Review:</span> Each expert also reviews your analyses and adds their specialized perspective to your reports.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Advanced Reporting */}
      <section className="py-20 bg-gradient-to-b from-cyan-500/5 via-blue-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-500 text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              Feature 3
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">Advanced Reporting</span>
              <Download className="w-8 h-8 text-cyan-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade reporting tools to track, share, and learn from your trading analyses. Click any feature to learn more.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTING_FEATURES.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveReport(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">All reports included:</span> Every analysis automatically generates a comprehensive report.
                Download as <span className="text-red-500 font-medium">PDF</span>, receive via <span className="text-blue-500 font-medium">email</span>,
                or access from your <span className="text-green-500 font-medium">dashboard</span> anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Alerts */}
      <section className="py-20 bg-gradient-to-b from-yellow-500/5 via-orange-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-sm font-medium mb-4">
              <Bell className="w-4 h-4" />
              Feature 4
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">Smart Alerts</span>
              <Send className="w-8 h-8 text-blue-400" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stay connected wherever you are. Get instant notifications via Telegram, Discord, and push notifications when important signals are triggered.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ALERTS_FEATURES.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveAlert(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-center gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground text-center line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Telegram & Discord:</span> Join our community channels or set up private bot notifications for personalized alerts.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Real-time Updates:</span> Get notified when your analyses hit TP/SL targets or when market conditions change.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 5: AI Concierge */}
      <section className="py-20 bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-sm font-medium mb-4">
              <Bot className="w-4 h-4" />
              Feature 5
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">AI Concierge</span>
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personal AI trading assistant. Just ask in plain language - analyze coins, check your stats, set alerts, and more. Voice input supported!
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: MessageCircle,
                  name: 'Natural Language',
                  description: 'Just type or speak your request. "Analyze BTC for me" or "How is ETH looking?"',
                  bg: 'bg-emerald-500/10',
                  color: 'text-emerald-500',
                  border: 'border-emerald-500/30',
                },
                {
                  icon: Mic,
                  name: 'Voice Commands',
                  description: 'Hands-free analysis with voice input. Perfect for busy traders on the go.',
                  bg: 'bg-teal-500/10',
                  color: 'text-teal-500',
                  border: 'border-teal-500/30',
                },
                {
                  icon: Zap,
                  name: 'Instant Analysis',
                  description: 'Get full 7-step analysis results in seconds. Entry, SL, TP levels included.',
                  bg: 'bg-cyan-500/10',
                  color: 'text-cyan-500',
                  border: 'border-cyan-500/30',
                },
                {
                  icon: Brain,
                  name: 'Expert Insights',
                  description: 'Ask trading questions and get answers from our AI Expert Panel (VOLTRAN).',
                  bg: 'bg-purple-500/10',
                  color: 'text-purple-500',
                  border: 'border-purple-500/30',
                },
              ].map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveConcierge(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-center gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground text-center line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Bilingual Support:</span> Speak Turkish or English - the AI understands both and responds in your language.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-teal-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">50+ Coins:</span> Analyze any major cryptocurrency with natural language aliases like "Bitcoin" or "Ethereum".
                  </div>
                </div>
              </div>
            </div>
            {/* Example commands showcase */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                '"Analyze BTC for me"',
                '"How is SOL doing?"',
                '"Check my stats"',
                '"Set alert for ETH at 4000"',
                '"What is RSI?"',
              ].map((cmd, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 6: TFT Model Prediction (Coming Soon) */}
      <section className="py-20 bg-gradient-to-b from-pink-500/5 via-purple-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Feature 6
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">TFT Model Prediction</span>
              <span className="text-sm bg-amber-500 text-white px-3 py-1 rounded-full font-medium">COMING SOON</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Advanced AI-powered price prediction using Temporal Fusion Transformer deep learning model. Get data-driven price forecasts to complement your technical analysis.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-card border-2 border-dashed border-pink-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <TrendingUp className="w-7 h-7 text-pink-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Price Forecasting</h3>
                <p className="text-sm text-muted-foreground">AI-generated price predictions for multiple timeframes based on historical patterns and market dynamics.</p>
              </div>
              <div className="p-6 bg-card border-2 border-dashed border-purple-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Target className="w-7 h-7 text-purple-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Target Zones</h3>
                <p className="text-sm text-muted-foreground">Machine learning-identified support and resistance zones with probability scores.</p>
              </div>
              <div className="p-6 bg-card border-2 border-dashed border-cyan-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <BarChart3 className="w-7 h-7 text-cyan-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Confidence Scores</h3>
                <p className="text-sm text-muted-foreground">Transparent confidence intervals showing prediction reliability for informed decision-making.</p>
              </div>
            </div>
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-amber-500">Coming Soon:</span> TFT Analysis will be available as an enhanced analysis option for <span className="font-semibold">{ANALYSIS_BUNDLES.find(b => b.comingSoon)?.credits || 50} credits</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Step Modal */}
      {activeStep !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveStep(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const item = ANALYSIS_STEPS[activeStep];
              const Icon = item.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 ${item.bg} ${item.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold">{item.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.bg} ${item.color} font-medium`}>Step {activeStep + 1}/7</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <button
                      onClick={() => setActiveStep(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* What We Analyze */}
                  <div className="mb-4">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What We Analyze</h5>
                    <ul className="space-y-2">
                      {item.whatWeDo.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${item.color} flex-shrink-0 mt-0.5`} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Why It Matters */}
                  <div className={`${item.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${item.color} mb-2`}>Why It Matters</h5>
                    <p className="text-sm">{item.whyItMatters}</p>
                  </div>

                  {/* Real Example */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Real Example</h5>
                    <p className="text-sm italic">{item.example}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Expert Modal */}
      {activeExpert !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveExpert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const expert = AI_EXPERTS[activeExpert];
              const ExpertIcon = expert.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-16 h-16 ${expert.bg} ${expert.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <ExpertIcon className={`w-8 h-8 ${expert.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold">{expert.name}</h4>
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </div>
                      <p className={`text-sm ${expert.color} font-medium`}>{expert.title}</p>
                    </div>
                    <button
                      onClick={() => setActiveExpert(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Credentials */}
                  <p className="text-xs text-muted-foreground mb-4 pb-3 border-b border-border">
                    {expert.credentials}
                  </p>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {expert.description}
                  </p>

                  {/* Expertise Areas */}
                  <div className={`${expert.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${expert.color} mb-2`}>Expertise Areas</h5>
                    <div className="flex flex-wrap gap-2">
                      {expert.focus.map((item, i) => (
                        <span key={i} className={`text-xs px-3 py-1.5 rounded-full border ${expert.border} ${expert.color} font-medium`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* What You Can Do */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border space-y-3">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Chat & Learn:</span> Start a conversation with {expert.name} to ask questions, learn concepts, and get personalized trading education.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Analysis Review:</span> {expert.name} also reviews your 7-step analyses and adds specialized insights to your reports.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Report Feature Modal */}
      {activeReport !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveReport(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const feature = REPORTING_FEATURES[activeReport];
              const FeatureIcon = feature.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-16 h-16 ${feature.bg} ${feature.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <FeatureIcon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{feature.name}</h4>
                      <p className={`text-sm ${feature.color} font-medium`}>Advanced Reporting</p>
                    </div>
                    <button
                      onClick={() => setActiveReport(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className={`${feature.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${feature.color} mb-3`}>Key Features</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {feature.highlights.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${feature.color} flex-shrink-0`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Availability:</span> This feature is included with all TraderPath accounts. No additional cost or subscription required.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Alert Feature Modal */}
      {activeAlert !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveAlert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const feature = ALERTS_FEATURES[activeAlert];
              const FeatureIcon = feature.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-16 h-16 ${feature.bg} ${feature.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <FeatureIcon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{feature.name}</h4>
                      <p className={`text-sm ${feature.color} font-medium`}>Smart Alerts</p>
                    </div>
                    <button
                      onClick={() => setActiveAlert(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className={`${feature.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${feature.color} mb-3`}>Key Features</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {feature.highlights.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${feature.color} flex-shrink-0`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How to Connect */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Get Started:</span> Connect your account from the dashboard settings. Join our Telegram channel or Discord server to start receiving alerts immediately.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

export default function LandingPage() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchPrices = useCallback(async () => {
    try {
      const symbols = TICKER_SYMBOLS.map(s => `"${s}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
      );
      if (response.ok) {
        const data = await response.json();
        const prices: LivePrice[] = data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
          const symbol = item.symbol.replace('USDT', '');
          const price = parseFloat(item.lastPrice);
          const change = parseFloat(item.priceChangePercent);
          return {
            symbol,
            price: price >= 1000
              ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : price >= 1
                ? price.toFixed(2)
                : price.toFixed(4),
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            up: change >= 0,
          };
        });
        setLivePrices(prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return (
    <div className="min-h-screen bg-background">
      {/* Live Price Ticker */}
      <div className="bg-accent/50 border-b py-2 overflow-hidden">
        <div className="flex gap-8 ticker-scroll whitespace-nowrap">
          {isLoadingPrices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Loading prices...
            </div>
          ) : (
            [...livePrices, ...livePrices].map((coin, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{coin.symbol}</span>
                <span className="text-muted-foreground">${coin.price}</span>
                <span className={coin.up ? 'text-green-500' : 'text-red-500'}>
                  {coin.change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <TraderPathLogo
            size="sm"
            showText={true}
            showTagline={false}
            href="/"
            className="flex-shrink-0 sm:hidden"
          />
          <TraderPathLogo
            size="md"
            showText={true}
            showTagline={true}
            href="/"
            className="flex-shrink-0 hidden sm:flex"
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">
              How it Works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">
              Pricing
            </a>
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="hidden sm:block px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition whitespace-nowrap"
            >
              Get Started
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a
                href="#features"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </a>
              <a
                href="#pricing"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <hr className="border-border" />
              <div className="flex items-center justify-between py-2">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 md:py-32 relative overflow-hidden">
        {/* Background gradient orbs - smaller on mobile */}
        <div className="absolute top-10 sm:top-20 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 sm:bottom-20 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-green-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-red-500/20 dark:from-teal-500/30 dark:via-cyan-500/20 dark:to-rose-500/30 border-2 border-teal-500/40 dark:border-teal-400/50 rounded-full text-sm sm:text-base font-semibold mb-4 sm:mb-6 shadow-lg shadow-teal-500/20 dark:shadow-teal-400/30">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 dark:text-teal-400" />
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 dark:from-teal-300 dark:via-cyan-300 dark:to-teal-300 bg-clip-text text-transparent">AI-Powered Trading Analysis</span>
          </div>
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="float">
              <TraderPathLogo size="lg" showText={false} className="flex sm:hidden" />
              <TraderPathLogo size="xl" showText={false} className="hidden sm:flex" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2 gradient-text-logo-animate">
            From Analysis to Action in 60 Seconds
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Stop drowning in charts. Our AI-powered 7-step analysis gives you clear
            buy/sell decisions with exact entry points, targets, and stop-losses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
            >
              <span className="gradient-text-rg-animate text-sm sm:text-base">Start Free Analysis</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 gradient-text-rg-animate" />
            </Link>
            <a
              href="#features"
              className="px-6 sm:px-8 py-3 sm:py-4 border rounded-lg font-semibold hover:bg-accent transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              See Features
            </a>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            Get 25 free credits on signup. No credit card required.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={50000} suffix="+" duration={2500} />
              </p>
              <p className="text-muted-foreground">Analyses Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={12000} suffix="+" duration={2500} />
              </p>
              <p className="text-muted-foreground">Active Traders</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                <CountUp end={87} suffix="%" duration={2000} />
              </p>
              <p className="text-muted-foreground">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                24/7
              </p>
              <p className="text-muted-foreground">Market Monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with 7-Step Analysis + AI Experts */}
      <FeaturesSection />

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">How TraderPath Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade analysis tools for informed trading decisions. We analyze, you decide.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Step 1: Select */}
              <div className="bg-card border rounded-xl p-6 relative">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  1
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-bold mb-2 gradient-text-logo-animate">Select Coin & Trade Type</h3>
                  <p className="text-sm text-muted-foreground mb-4">Choose from 200+ coins and select your trading style</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-accent text-xs rounded">Scalping (5m-15m)</span>
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-500 text-xs rounded">Day Trade (1h-4h)</span>
                    <span className="px-2 py-1 bg-accent text-xs rounded">Swing (1D-1W)</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Analysis */}
              <div className="bg-card border rounded-xl p-6 relative">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  2
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-bold mb-2 gradient-text-logo-animate">Run 7-Step Analysis</h3>
                  <p className="text-sm text-muted-foreground mb-4">AI analyzes market conditions across 7 key dimensions</p>
                  <div className="grid grid-cols-4 gap-1">
                    {ANALYSIS_STEPS.slice(0, 7).map((step, idx) => {
                      const Icon = step.icon;
                      return (
                        <div key={idx} className={`p-1.5 ${step.bg} rounded flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                        </div>
                      );
                    })}
                    <div className="p-1.5 bg-green-500/10 rounded flex items-center justify-center col-span-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Verdict */}
              <div className="bg-card border rounded-xl p-6 relative">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  3
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-bold mb-2 gradient-text-logo-animate">Get Clear Verdict</h3>
                  <p className="text-sm text-muted-foreground mb-4">Receive actionable signal with entry, SL & TP levels</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded">GO</span>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded">CONDITIONAL</span>
                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded">WAIT</span>
                    <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-medium rounded">AVOID</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* AI Expert */}
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">AI Expert Chat</h4>
                    <p className="text-xs text-muted-foreground">Ask questions about your analysis</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {AI_EXPERTS.slice(0, 4).map((expert, idx) => {
                    const ExpertIcon = expert.icon;
                    return (
                      <div key={idx} className={`p-1.5 ${expert.bg} rounded`}>
                        <ExpertIcon className={`w-3.5 h-3.5 ${expert.color}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PDF Report */}
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">PDF Report</h4>
                    <p className="text-xs text-muted-foreground">Download with AI Expert insights</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Full 7-step analysis with Tokenomics, 40+ indicators, and trade plan in professional PDF format.</p>
              </div>

              {/* TFT Model - Coming Soon */}
              <div className="bg-card border border-dashed border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-full">COMING SOON</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">TFT AI Model</h4>
                    <p className="text-xs text-muted-foreground">AI-powered price prediction</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Temporal Fusion Transformer model for 24h/7d price predictions with confidence intervals.</p>
              </div>
            </div>
          </div>

          {/* How We Measure Analysis Accuracy */}
          <div className="mt-16 pt-16 border-t border-border">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-3 gradient-text-logo-animate">How We Measure Analysis Accuracy</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Outcome-verified methodology based on real price movements
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
              {/* TP/SL Based */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">TP/SL Verification</h4>
                <p className="text-xs text-muted-foreground">
                  Each GO signal includes Entry, Stop Loss, and Take Profit levels. We track if price hits
                  <span className="text-green-500 font-medium"> TP</span> or
                  <span className="text-red-500 font-medium"> SL</span> first.
                </p>
              </div>

              {/* Outcome Tracking */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">Outcome Tracking</h4>
                <p className="text-xs text-muted-foreground">
                  We monitor each trade until price hits
                  <span className="text-green-500 font-medium"> Take Profit</span> or
                  <span className="text-red-500 font-medium"> Stop Loss</span>.
                  No arbitrary time limits—real market outcomes.
                </p>
              </div>

              {/* GO Signal Rate */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">GO Signal Accuracy</h4>
                <p className="text-xs text-muted-foreground">
                  We specifically track GO and CONDITIONAL_GO signals. Platform accuracy shows how often these signals hit their first Take Profit target.
                </p>
              </div>

              {/* Public Dashboard */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">Dashboard Transparency</h4>
                <p className="text-xs text-muted-foreground">
                  All users see the same platform accuracy stats on their dashboard. Every outcome—correct or incorrect—is counted in real-time.
                </p>
              </div>
            </div>

            {/* Accuracy Formula */}
            <div className="max-w-2xl mx-auto bg-accent/50 rounded-xl p-6 border">
              <h4 className="font-semibold text-center mb-4 gradient-text-logo-animate">Accuracy Calculation Formula</h4>
              <div className="flex items-center justify-center gap-2 text-sm mb-4 flex-wrap">
                <span className="px-3 py-1.5 bg-background rounded-lg font-mono">Accuracy</span>
                <span>=</span>
                <span className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg font-mono">TP Hits</span>
                <span>÷</span>
                <span className="px-3 py-1.5 bg-background rounded-lg font-mono">(TP Hits + SL Hits)</span>
                <span>× 100</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Only closed trades count. Expired or neutral outcomes are excluded from accuracy calculation.
              </p>
            </div>

            <p className="text-center mt-8 text-muted-foreground italic text-sm">
              &quot;We provide analysis tools and education—your trading decisions are always your own.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">No Trading Keys Required</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">12,000+ Active Traders</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-muted-foreground">
              See what our users have to say about TraderPath
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="p-6 bg-card border rounded-lg">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Credit-Based Pricing
            </h2>
            <p className="text-muted-foreground mb-8">
              Pay only for what you use. No subscriptions, no hidden fees.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              View Pricing Plans
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about TraderPath
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* As Seen On / Media */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground text-sm mb-8">TRUSTED BY TRADERS FROM</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {/* Placeholder logos - replace with actual partner/media logos */}
            <div className="text-2xl font-bold text-muted-foreground">Binance</div>
            <div className="text-2xl font-bold text-muted-foreground">Coinbase</div>
            <div className="text-2xl font-bold text-muted-foreground">Kraken</div>
            <div className="text-2xl font-bold text-muted-foreground">KuCoin</div>
            <div className="text-2xl font-bold text-muted-foreground">Bybit</div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            *Users from these platforms trust TraderPath for their trading analysis
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-green-500/5"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center p-8 md:p-12 bg-card border rounded-2xl shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Limited Time: 25 Free Credits
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 gradient-text-logo-animate">
              Ready to Trade Smarter?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 12,000+ traders who already use TraderPath to make informed decisions.
              Start with 25 free credits today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 text-lg"
              >
                <span className="gradient-text-rg-animate">Start Free Analysis</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • 7-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
                <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
                <li><Link href="/disclaimer" className="hover:text-foreground transition">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground transition">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition">Contact</Link></li>
                <li><Link href="/status" className="hover:text-foreground transition">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 TraderPath. All rights reserved.
            </p>
            <p className="text-muted-foreground text-sm">
              Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

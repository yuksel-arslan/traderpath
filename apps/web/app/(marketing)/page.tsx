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
  Smartphone
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TradePathLogo } from '../../components/common/TradePathLogo';
import { CREDIT_PACKAGES } from '../../lib/pricing-config';
import { LiveAnalysisPreview } from '../../components/marketing/LiveAnalysisPreview';

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
    content: 'TradePath helped me avoid 3 manipulation traps in just one week. The Safety Check feature is incredible.',
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
    question: 'What is TradePath and how does it work?',
    answer: 'TradePath is an AI-powered trading analysis platform that runs your chosen cryptocurrency through 7 specialized analysis steps. In about 60 seconds, you get a complete trade plan with entry points, targets, stop-losses, and a final verdict on whether to trade or wait.',
  },
  {
    question: 'Do I need to connect my exchange or wallet?',
    answer: 'No! TradePath is purely an analysis tool. We never ask for your trading keys, wallet addresses, or exchange credentials. Your funds stay safe in your own accounts.',
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
    answer: 'Yes! We offer a 7-day money-back guarantee on your first credit purchase. If TradePath doesn\'t meet your expectations, contact support for a full refund.',
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
    description: 'Download professional PDF reports for each analysis. Perfect for record-keeping and sharing with your trading partners.',
    highlights: ['Branded professional layout', 'Complete analysis data', 'Charts & visualizations', 'Offline access']
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
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
                    <h3 className="font-semibold mb-1">{step.name}</h3>
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
                    <h3 className="font-semibold mb-1">{step.name}</h3>
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
                        <h3 className="font-semibold text-lg">{step.name}</h3>
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
              4 AI Experts Council
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
                      <h3 className="font-bold text-lg mb-1">{expert.name}</h3>
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
              Advanced Reporting
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
                    <h3 className="font-bold text-lg mb-2">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">All reports included:</span> Every analysis automatically generates a comprehensive report.
                Download as <span className="text-cyan-500 font-medium">PDF</span>, receive via <span className="text-blue-500 font-medium">email</span>,
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
              Smart Alerts
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
                    <h3 className="font-bold text-lg mb-2 text-center">{feature.name}</h3>
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

      {/* Analysis Step Modal */}
      {activeStep !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveStep(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveExpert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveReport(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
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
                      <span className="font-semibold text-foreground">Availability:</span> This feature is included with all TradePath accounts. No additional cost or subscription required.
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveAlert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TradePathLogo size="md" showText showTagline href="/" />
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6 shimmer">
            <Zap className="w-4 h-4" />
            AI-Powered Trading Analysis
          </div>
          <div className="flex justify-center mb-8">
            <div className="float">
              <TradePathLogo size="xl" showText={false} />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            From Analysis to Action{' '}
            <span className="gradient-text-animate">
              in 60 Seconds
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop drowning in charts. Our AI-powered 7-step analysis gives you clear
            buy/sell decisions with exact entry points, targets, and stop-losses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
            >
              <span className="gradient-text-rg-animate">Start Free Analysis</span>
              <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
            </Link>
            <a
              href="#see-it-in-action"
              className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              See It In Action
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Get 25 free credits on signup. No credit card required.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '50K+', label: 'Analyses Completed' },
              { value: '12K+', label: 'Active Traders' },
              { value: '87%', label: 'Accuracy Rate' },
              { value: '24/7', label: 'Market Monitoring' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold gradient-text">
                  {stat.value}
                </p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with 7-Step Analysis + AI Experts */}
      <FeaturesSection />

      {/* Why TradePath Section */}
      <section className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose TradePath?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how TradePath compares to traditional analysis tools
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full bg-card border rounded-lg overflow-hidden">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Traditional Tools</th>
                    <th className="text-center p-4 font-semibold gradient-text">TradePath</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Time to Decision', traditional: 'Hours of chart analysis', tradepath: '60 seconds' },
                    { feature: 'Manipulation Detection', traditional: 'Manual research required', tradepath: 'AI-powered auto-detection' },
                    { feature: 'Entry/Exit Points', traditional: 'Self-calculated', tradepath: 'Precise levels provided' },
                    { feature: 'Risk Management', traditional: 'DIY stop-loss', tradepath: 'Complete trade plan included' },
                    { feature: 'Learning Curve', traditional: 'Months to master', tradepath: 'Start immediately' },
                    { feature: 'Pricing', traditional: '$50-300/month subscriptions', tradepath: 'Pay per analysis' },
                  ].map((row, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-muted-foreground">{row.traditional}</td>
                      <td className="p-4 text-center text-green-500 font-medium">{row.tradepath}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-red-500 mb-2">7</div>
                <p className="text-muted-foreground">Analysis steps in one click</p>
              </div>
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-amber-500 mb-2">60s</div>
                <p className="text-muted-foreground">From question to trade plan</p>
              </div>
              <div className="p-4 bg-card border rounded-lg text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">$0.50</div>
                <p className="text-muted-foreground">Per comprehensive analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How TradePath Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We don&apos;t trade for you. We provide scientific analysis and education so you can make informed decisions.
            </p>
          </div>

          {/* Integrated Flow */}
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Step 1: Research */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                1
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="text-xl font-bold mb-1">Research & Explore</h3>
                <p className="text-muted-foreground text-sm">Select a coin and let our AI gather comprehensive market data, technicals, and fundamentals</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center md:justify-start md:ml-7">
              <div className="w-0.5 h-6 bg-border" />
            </div>

            {/* Step 2: Scientific Analysis */}
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/20">
                2
              </div>
              <div className="flex-1">
                <div className="text-center md:text-left mb-4">
                  <h3 className="text-xl font-bold mb-1">Scientific 7-Step Analysis</h3>
                  <p className="text-muted-foreground text-sm">Our AI applies proven methodologies across 7 specialized disciplines for objective insights</p>
                </div>

                {/* 7 Steps Grid */}
                <AnalysisStepsGrid />
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center md:justify-start md:ml-7">
              <div className="w-0.5 h-6 bg-border" />
            </div>

            {/* Step 3: Learn & Decide */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-green-500/20">
                3
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="text-xl font-bold mb-1">Learn & Make Informed Decisions</h3>
                <p className="text-muted-foreground text-sm">Understand the analysis, chat with AI experts for deeper insights, and decide what&apos;s right for you</p>
              </div>
            </div>
          </div>

          {/* How We Measure Analysis Accuracy */}
          <div className="mt-16 pt-16 border-t border-border">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-3">How We Measure Analysis Accuracy</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Transparent methodology to validate our analysis quality
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Scientific Method */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
                <h4 className="font-semibold mb-2">Scientific Method</h4>
                <p className="text-sm text-muted-foreground">
                  Each analysis includes specific price levels. We verify if the market
                  <span className="text-green-500 font-medium"> confirms</span> or
                  <span className="text-red-500 font-medium"> invalidates</span> our projections.
                </p>
              </div>

              {/* Tracked Accuracy */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-semibold mb-2">Tracked Accuracy</h4>
                <p className="text-sm text-muted-foreground">
                  We monitor price movements against our analysis projections.
                  Every analysis outcome is logged and visible.
                </p>
              </div>

              {/* Full Transparency */}
              <div className="bg-card border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <h4 className="font-semibold mb-2">Full Transparency</h4>
                <p className="text-sm text-muted-foreground">
                  All analyses are recorded. We show both accurate and inaccurate calls.
                  No hidden results, just honest data.
                </p>
              </div>
            </div>

            <p className="text-center mt-8 text-muted-foreground italic text-sm">
              &quot;We provide analysis and education - what you do with it is your informed decision.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Live Analysis Preview */}
      <section id="see-it-in-action" className="py-20 bg-accent/50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See TradePath in Action
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Here's a real example of our 7-step analysis for Bitcoin
            </p>
          </div>

          {/* Live Analysis Card - Real BTC Data */}
          <LiveAnalysisPreview />
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Trading Command Center
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A clean, intuitive dashboard designed for traders who want results, not complexity
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl">
              {/* Dashboard Header */}
              <div className="bg-accent/50 p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-lg"></div>
                    <span className="font-bold gradient-text">TradePath</span>
                  </div>
                  <nav className="hidden md:flex items-center gap-4 ml-8">
                    <span className="text-sm font-medium text-primary">Dashboard</span>
                    <span className="text-sm text-muted-foreground">Analyze</span>
                    <span className="text-sm text-muted-foreground">Reports</span>
                    <span className="text-sm text-muted-foreground">Alerts</span>
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-sm font-medium">
                    125 Credits
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-amber-500 to-green-500 rounded-full"></div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Stats */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Analyses</p>
                    <p className="text-2xl font-bold">147</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-green-500">73%</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
                    <p className="text-2xl font-bold text-cyan-500">5</p>
                  </div>
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Credits Left</p>
                    <p className="text-2xl font-bold">125</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 bg-gradient-to-br from-red-500/10 via-amber-500/10 to-green-500/10 rounded-lg border border-amber-500/20">
                  <h4 className="font-semibold mb-3">Quick Analysis</h4>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">BTC</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">ETH</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">SOL</span>
                    <span className="px-3 py-1 bg-background border rounded-full text-sm cursor-pointer hover:bg-accent">+50</span>
                  </div>
                </div>

                {/* Recent Analyses */}
                <div className="md:col-span-3">
                  <h4 className="font-semibold mb-4">Recent Analyses</h4>
                  <div className="space-y-3">
                    {[
                      { coin: 'BTC', verdict: 'LONG', score: 87, time: '2 hours ago', profit: '+4.2%' },
                      { coin: 'ETH', verdict: 'SHORT', score: 72, time: '5 hours ago', profit: '+2.8%' },
                      { coin: 'SOL', verdict: 'WAIT', score: 55, time: '1 day ago', profit: '—' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center font-bold text-sm">
                            {item.coin.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{item.coin}/USDT</p>
                            <p className="text-xs text-muted-foreground">{item.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.verdict === 'LONG' ? 'bg-green-500/20 text-green-500' :
                            item.verdict === 'SHORT' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {item.verdict}
                          </span>
                          <span className="font-bold">{item.score}/100</span>
                          <span className={`font-medium ${item.profit.startsWith('+') ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {item.profit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA under dashboard */}
            <div className="text-center mt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-[1.02] transition shadow-lg border border-slate-300 dark:border-slate-600"
              >
                <span className="gradient-text-rg-animate">Start Your Free Dashboard</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-muted-foreground">
              See what our users have to say about TradePath
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

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Credit-Based Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. No subscriptions, no hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CREDIT_PACKAGES.map((plan, index) => (
              <div
                key={plan.id}
                className={`p-6 bg-card border rounded-lg relative ${
                  plan.popular ? 'border-primary ring-2 ring-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {plan.credits} credits
                  </span>
                </p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border hover:bg-accent'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about TradePath
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
            *Users from these platforms trust TradePath for their trading analysis
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Trade{' '}
              <span className="gradient-text-animate">Smarter?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 12,000+ traders who already use TradePath to make informed decisions.
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
                <li><a href="#pricing" className="hover:text-foreground transition">Pricing</a></li>
                <li><Link href="/credits" className="hover:text-foreground transition">Credits</Link></li>
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
              © 2025 TradePath. All rights reserved.
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

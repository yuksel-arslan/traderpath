import { BilgePage } from '../../../components/BilgePage';

export const metadata = {
  title: 'BILGE - AI Development Architect | TraderPath',
  description: 'Meet BILGE, the AI Development Architect powered by Claude Opus 4.5. Named after Bilge Kağan (685-734 AD), BILGE embodies wisdom, precision, and innovation in software development.',
  keywords: ['BILGE', 'AI Architect', 'Claude Opus', 'TraderPath', 'Bilge Kagan', 'AI Development'],
  openGraph: {
    title: 'BILGE - AI Development Architect | TraderPath',
    description: 'Meet BILGE, the AI Development Architect powered by Claude Opus 4.5. Building the future of trading analysis with wisdom and precision.',
    type: 'website',
  },
};

export default function BilgeRoute() {
  return <BilgePage />;
}

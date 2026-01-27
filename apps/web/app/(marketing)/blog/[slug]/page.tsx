'use client';

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar, Share2, Twitter, Linkedin, Facebook, ChevronRight } from 'lucide-react';
import { TraderPathLogo } from '../../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../../components/common/ThemeToggle';
import { getArticleBySlug, getAllArticles, BlogArticle } from '../../../../lib/blog-data';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Education':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'Market Analysis':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'Trading':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'Technology':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case 'Product Updates':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-accent text-muted-foreground';
  }
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="bg-accent rounded-lg p-4 overflow-x-auto my-4">
            <code className="text-sm">{codeContent.join('\n')}</code>
          </pre>
        );
        codeContent = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-2xl font-bold mt-8 mb-4">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={index} className="my-8 border-border" />);
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={index} className="ml-4 text-muted-foreground">
          {line.replace('- ', '')}
        </li>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={index} className="font-semibold mt-4 mb-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (line.trim() === '') {
      elements.push(<br key={index} />);
    } else {
      const formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code class="bg-accent px-1.5 py-0.5 rounded text-sm">$1</code>');
      elements.push(
        <p
          key={index}
          className="text-muted-foreground leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    }
  });

  return <div className="prose-content">{elements}</div>;
}

function RelatedArticles({ currentSlug, category }: { currentSlug: string; category: string }) {
  const allArticles = getAllArticles();
  const related = allArticles
    .filter((a) => a.slug !== currentSlug)
    .filter((a) => a.category === category || Math.random() > 0.5)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {related.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group bg-card border rounded-xl p-6 hover:border-primary/50 transition"
          >
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${getCategoryColor(article.category)}`}>
              {article.category}
            </span>
            <h3 className="font-semibold mb-2 group-hover:text-primary transition line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition">
              About
            </Link>
            <Link href="/blog" className="text-foreground font-medium">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/blog" className="hover:text-foreground transition">
            Blog
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{article.category}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-12">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getCategoryColor(article.category)}`}>
            {article.category}
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {article.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            {article.excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{article.author}</span>
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(article.publishedAt)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {article.readTime} min read
            </span>
          </div>
        </header>

        {/* Share Buttons */}
        <div className="flex items-center gap-4 mb-12 pb-8 border-b">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share:
          </span>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition"
            aria-label="Share on Twitter"
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition"
            aria-label="Share on LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition"
            aria-label="Share on Facebook"
          >
            <Facebook className="w-5 h-5" />
          </a>
        </div>

        {/* Article Content */}
        <article className="mb-12">
          <MarkdownContent content={article.content} />
        </article>

        {/* CTA Box */}
        <div className="p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">Ready to Start Trading Smarter?</h3>
          <p className="text-muted-foreground mb-6">
            Join thousands of traders using TraderPath&apos;s AI-powered analysis to make better decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
            >
              Start Free Analysis
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 border rounded-lg font-semibold hover:bg-accent transition"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        <RelatedArticles currentSlug={article.slug} category={article.category} />
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 <span className="text-red-500 font-semibold">Trader</span><span className="text-green-500 font-semibold">Path</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-foreground transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

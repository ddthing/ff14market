import { Link } from 'react-router-dom';

const SERVICE_LINKS = [
  { to: '/guide', label: '가이드' },
  { to: '/faq', label: '자주 묻는 질문' },
  { to: '/about', label: '소개' },
  { to: '/terms', label: '이용약관' },
  { to: '/privacy', label: '개인정보처리방침' },
  { to: '/support', label: '후원' },
];

export const Footer = () => {
  return (
    <footer className="mobile-footer mt-auto border-t border-[var(--app-hairline)] bg-transparent py-4">
      <div className="container mx-auto flex max-w-6xl flex-col gap-2 px-4 text-[11px] text-[var(--app-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="서비스 안내">
          {SERVICE_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="font-medium transition-colors hover:text-[var(--app-ink)]">
              {label}
            </Link>
          ))}
        </nav>
        <p className="leading-4 sm:text-right">
          데이터: Universalis API · Created by <a href="https://x.com/reconeur" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors hover:text-[var(--app-accent)]">@reconeur<span className="sr-only"> (새 창에서 열림)</span></a>
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline">FINAL FANTASY XIV © SQUARE ENIX CO., LTD.</span>
        </p>
      </div>
    </footer>
  );
};

import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="mobile-footer mt-auto border-t border-[var(--app-hairline)] bg-transparent py-4">
      <div className="container mx-auto flex max-w-6xl flex-col gap-2 px-4 text-[11px] text-[var(--app-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="서비스 안내">
          <Link to="/terms" className="font-medium transition-colors hover:text-[var(--app-ink)]">이용약관</Link>
          <Link to="/privacy" className="font-medium transition-colors hover:text-[var(--app-ink)]">개인정보처리방침</Link>
          <a 
            href="https://ko-fi.com/reconeur" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-bold text-[var(--app-ink)] transition-colors hover:text-[var(--app-accent)]"
          >
            ☕ 후원하기
          </a>
        </nav>
        <p className="leading-4 sm:text-right">
          데이터: Universalis API · Created by <a href="https://x.com/reconeur" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors hover:text-[var(--app-accent)]">@reconeur</a>
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline">FINAL FANTASY XIV © SQUARE ENIX CO., LTD.</span>
        </p>
      </div>
    </footer>
  );
};

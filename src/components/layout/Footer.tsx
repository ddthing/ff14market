import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-[var(--app-hairline)] pt-8 pb-12 bg-transparent">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col space-y-6">
        <div className="flex items-center space-x-6 text-[13px] font-medium text-[var(--app-ink-muted)]">
          <Link to="/terms" className="transition-colors hover:text-[var(--app-ink)]">이용약관</Link>
          <Link to="/privacy" className="transition-colors hover:text-[var(--app-ink)]">개인정보처리방침</Link>
          <a 
            href="https://ko-fi.com/reconeur" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-bold text-[var(--app-ink)] transition-colors hover:text-[var(--app-accent)]"
          >
            ☕ 후원하기
          </a>
        </div>
        <div className="space-y-1.5 text-[12px] font-normal text-[var(--app-ink-muted)]">
          <p>
            Created by <a href="https://x.com/reconeur" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors hover:text-[var(--app-accent)]">@reconeur</a>
          </p>
          <p>Data provided by Universalis API.</p>
          <p>FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

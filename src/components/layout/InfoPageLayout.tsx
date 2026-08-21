import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InfoPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  children: ReactNode;
}

/**
 * Shared reading layout for public information pages.
 * Keeping the type scale here prevents each policy or guide page from
 * gradually growing its own heading and paragraph sizes.
 */
export const InfoPageLayout = ({
  eyebrow,
  title,
  description,
  updatedAt,
  children,
}: InfoPageLayoutProps) => (
  <article className="info-page animate-fade-in">
    <header className="info-page__header">
      <Link to="/" className="info-page__back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>장터로 돌아가기</span>
      </Link>
      <p className="info-page__eyebrow">{eyebrow}</p>
      <h1 className="info-page__title">{title}</h1>
      <p className="info-page__lead">{description}</p>
      {updatedAt && <p className="info-page__updated">마지막 업데이트 · {updatedAt}</p>}
    </header>
    <div className="info-page__content">{children}</div>
  </article>
);

export const SkeletonRow = () => {
  return (
    <div className="flex items-center justify-between border-b border-[var(--app-hairline)] px-4 py-[18px] sm:px-6">
      {/* Left side */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
        <div className="h-[18px] w-[18px] animate-pulse rounded bg-[var(--app-surface-subtle)]" />
        <div className="hidden h-4 w-4 animate-pulse rounded bg-[var(--app-surface-subtle)] sm:block" />
        <div className="h-[42px] w-[42px] animate-pulse rounded-full bg-[var(--app-surface-subtle)]" />
        <div className="h-5 w-24 animate-pulse rounded bg-[var(--app-surface-subtle)] sm:w-32" />
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-12 ml-2">
        <div className="h-5 w-16 animate-pulse rounded bg-[var(--app-surface-subtle)] sm:w-24" />
        <div className="h-5 w-12 animate-pulse rounded bg-[var(--app-surface-subtle)] sm:w-16" />
        <div className="hidden h-5 w-12 animate-pulse rounded bg-[var(--app-surface-subtle)] sm:block" />
      </div>
    </div>
  );
};

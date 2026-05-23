export const SkeletonRow = () => {
  return (
    <div className="flex items-center justify-between py-[18px] px-4 sm:px-6 border-b border-gray-100 dark:border-gray-800/60">
      {/* Left side */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
        <div className="w-[18px] h-[18px] rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse hidden sm:block" />
        <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="w-24 sm:w-32 h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-12 ml-2">
        <div className="w-16 sm:w-24 h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="w-12 sm:w-16 h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="hidden sm:block w-12 h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
};

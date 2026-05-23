import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-gray-200/60 dark:border-gray-800/60 pt-8 pb-12 bg-transparent">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col space-y-6">
        <div className="flex items-center space-x-6 text-[13px] font-medium text-gray-500 dark:text-[#9ea4aa]">
          <Link to="/terms" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">이용약관</Link>
          <Link to="/privacy" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">개인정보처리방침</Link>
          <a 
            href="https://ko-fi.com/reconeur" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-bold text-gray-700 dark:text-gray-300"
          >
            ☕ 후원하기
          </a>
        </div>
        <div className="text-[12px] text-gray-400 dark:text-[#9ea4aa] space-y-1.5 font-normal">
          <p>
            Created by <a href="https://x.com/reconeur" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 font-medium transition-colors">@reconeur</a>
          </p>
          <p>Data provided by Universalis API.</p>
          <p>FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

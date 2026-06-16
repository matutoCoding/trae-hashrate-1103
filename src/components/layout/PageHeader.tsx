import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function PageHeader({ title, showBack = false, rightElement }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="mr-2 p-1 -ml-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        {rightElement && <div className="flex items-center">{rightElement}</div>}
      </div>
    </header>
  );
}

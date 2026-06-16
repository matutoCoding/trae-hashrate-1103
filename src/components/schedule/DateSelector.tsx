import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, addDays, getWeekDay, isToday } from '@/utils/dateUtils';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const dates = [];
  for (let i = -1; i <= 5; i++) {
    dates.push(addDays(formatDate(new Date()), i));
  }

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex items-center px-4 py-2">
        <button
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-gray-700">
            {selectedDate.slice(5)} {getWeekDay(selectedDate)}
          </span>
        </div>
        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="flex px-2 pb-2 overflow-x-auto scrollbar-hide">
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const isTodayDate = isToday(date);
          return (
            <button
              key={date}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center px-4 py-2 mx-1 rounded-lg min-w-[60px] transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xs">{getWeekDay(date)}</span>
              <span className="text-lg font-semibold">
                {date.split('-')[2]}
              </span>
              {isTodayDate && !isSelected && (
                <span className="text-xs text-blue-600">今天</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

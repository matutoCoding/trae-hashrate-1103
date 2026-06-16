export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function addMinutes(timeStr: string, minutes: number): string {
  const { hours, minutes: mins } = parseTime(timeStr);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

export function timeDiffMinutes(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
}

export function isTimeBefore(time1: string, time2: string): boolean {
  return timeDiffMinutes(time1, time2) > 0;
}

export function isTimeAfter(time1: string, time2: string): boolean {
  return timeDiffMinutes(time2, time1) > 0;
}

export function generateTimeSlots(
  date: string,
  tableId: string,
  startTime: string = '08:00',
  endTime: string = '18:00',
  slotDuration: number = 30
) {
  const slots = [];
  let currentTime = startTime;
  let slotIndex = 0;

  while (isTimeBefore(currentTime, endTime)) {
    const slotEnd = addMinutes(currentTime, slotDuration);
    if (isTimeAfter(slotEnd, endTime)) break;
    
    slots.push({
      id: `${tableId}-${date}-${slotIndex}`,
      tableId,
      date,
      startTime: currentTime,
      endTime: slotEnd,
      status: 'free' as const,
    });
    currentTime = slotEnd;
    slotIndex++;
  }

  return slots;
}

export function getToday(): string {
  return formatDate(new Date());
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
  }
  return `${mins}分钟`;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function getWeekDay(dateStr: string): string {
  const date = new Date(dateStr);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekDays[date.getDay()];
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

export function getDateRange(startDate: string, days: number): string[] {
  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

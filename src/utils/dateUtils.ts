export function getWeekDates() {
  const curr = new Date();
  // Se for domingo (0), queremos que seja o último dia da semana, então voltamos para a segunda anterior
  const day = curr.getDay() === 0 ? 7 : curr.getDay(); 
  const first = curr.getDate() - day + 1;

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(curr.getTime());
    next.setDate(first + i);
    dates.push(next);
  }
  return dates;
}

export function formatDateForDB(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export const formatDate = formatDateDisplay;

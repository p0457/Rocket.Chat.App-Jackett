export function timeSince(date: Date|string): string {
  let dateTemp = new Date();
  if (typeof date === 'string') {
    dateTemp = new Date(date);
  }
  const newDate = new Date();
  const diff = +newDate - +dateTemp;
  const seconds = Math.floor((diff) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + ' years';
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + ' months';
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + ' days';
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + ' hours';
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + ' minutes';
  }
  return Math.floor(seconds) + ' seconds';
}

export function formatDate(date: Date|string): string {
  let dateTemp = new Date();
  if (typeof date === 'string') {
    dateTemp = new Date(date);
  }
  const year = dateTemp.getUTCFullYear();
  const month = dateTemp.getUTCMonth() + 1;
  let monthString = month.toString();
  if (month < 10) {
    monthString = `0${month}`;
  }
  const day = dateTemp.getUTCDate();
  let dayString = day.toString();
  if (day < 10) {
    dayString = `0${day}`;
  }
  const formattedDate = `${year.toString()}-${monthString}-${dayString}`;
  return formattedDate;
}

export function getYear(date: Date|string): number {
  let dateTemp = new Date();
  if (typeof date === 'string') {
    dateTemp = new Date(date);
  }
  const year = dateTemp.getUTCFullYear();
  return year;
}

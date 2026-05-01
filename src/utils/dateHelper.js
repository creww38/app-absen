function formatDate(date, timezone, format) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  const formats = {
    'yyyy-MM-dd': `${year}-${month}-${day}`,
    'HH:mm': `${hours}:${minutes}`,
    'HH:mm:ss': `${hours}:${minutes}:${seconds}`,
    'dd-MM-yyyy': `${day}-${month}-${year}`,
    'yyyy-MM-dd HH:mm:ss': `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  };
  
  return formats[format] || formats['yyyy-MM-dd'];
}

function calculateTimeDiff(startTime, endTime) {
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  const totalMinutes1 = h1 * 60 + m1;
  const totalMinutes2 = h2 * 60 + m2;
  return totalMinutes2 - totalMinutes1;
}

function isToday(dateStr) {
  const today = formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  return dateStr === today;
}

function getCurrentTime() {
  return formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
}

function getCurrentDate() {
  return formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

module.exports = {
  formatDate,
  calculateTimeDiff,
  isToday,
  getCurrentTime,
  getCurrentDate
};
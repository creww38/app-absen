function validateNisn(nisn) {
  const nisnStr = String(nisn).trim();
  return nisnStr.length >= 8 && nisnStr.length <= 12 && /^\d+$/.test(nisnStr);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  const phoneStr = String(phone).trim();
  return phoneStr.length >= 10 && phoneStr.length <= 13 && /^\d+$/.test(phoneStr);
}

function validateTime(time) {
  const re = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return re.test(time);
}

function validateDate(date) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return re.test(date);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

module.exports = {
  validateNisn,
  validateEmail,
  validatePhone,
  validateTime,
  validateDate,
  sanitizeInput
};
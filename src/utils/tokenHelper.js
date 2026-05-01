function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getExpiryDate(hours = 24) {
  const expiry = new Date();
  expiry.setTime(expiry.getTime() + (hours * 60 * 60 * 1000));
  return expiry;
}

module.exports = {
  generateToken,
  getExpiryDate
};
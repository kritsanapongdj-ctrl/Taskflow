// src/utils/dateUtils.js
// Centralized Bangkok Date/Time Utilities (Asia/Bangkok - UTC+7)

/**
 * Returns today's date string in Bangkok timezone: 'YYYY-MM-DD'
 * Eliminates the midnight-to-7am UTC date lag bug.
 */
export const getBangkokDateStr = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
};

/**
 * Returns the current month string in Bangkok timezone: 'YYYY-MM'
 */
export const getBangkokMonthStr = (date = new Date()) => {
  return getBangkokDateStr(date).slice(0, 7);
};

/**
 * Returns current hour and minute in Bangkok timezone
 */
export const getBangkokTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
};

export const getTStr = getBangkokDateStr;
export const getMStr = getBangkokMonthStr;

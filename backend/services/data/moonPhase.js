// Moon phase calculator for real 1950 lunar data.
// Used by climate API, trip-day generator, and narrative prompts.

// Known new moon for 1950-01-18 ~08:00 UTC (NASA/USNO tables)
const KNOWN_NEW_MOON_UTC = new Date('1950-01-18T08:00:00Z');
const SYNODIC_MONTH_DAYS = 29.530588861;

function toDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return new Date(`${match[1]}T00:00:00Z`);
  }
  return new Date(input);
}

/**
 * Compute the moon phase for a given date.
 * @param {Date|string} dateInput - a Date or an ISO/date string (YYYY-MM-DD or timestamp)
 * @returns {{phase: string, illumination: number, age_days: number}}
 */
export function getMoonPhase(dateInput) {
  const d = toDate(dateInput);
  const daysSince = (d - KNOWN_NEW_MOON_UTC) / (1000 * 60 * 60 * 24);
  const synodicMonth = SYNODIC_MONTH_DAYS;
  const age = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * age / synodicMonth));

  const newWindow = 1.5;
  const fullWindow = 1.5;
  const quarterWindow = 1.5;
  const q = synodicMonth / 4;

  let phase;
  if (age < newWindow || age > synodicMonth - newWindow) {
    phase = 'new_moon';
  } else if (Math.abs(age - q) < quarterWindow) {
    phase = 'first_quarter';
  } else if (Math.abs(age - 2 * q) < fullWindow) {
    phase = 'full_moon';
  } else if (Math.abs(age - 3 * q) < quarterWindow) {
    phase = 'last_quarter';
  } else if (age < q) {
    phase = 'waxing_crescent';
  } else if (age < 2 * q) {
    phase = 'waxing_gibbous';
  } else if (age < 3 * q) {
    phase = 'waning_gibbous';
  } else {
    phase = 'waning_crescent';
  }

  return {
    phase,
    illumination,
    age_days: age,
  };
}

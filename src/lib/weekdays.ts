// One place that reads working-day lists ("Monday, Tuesday, Sat"), shared by the
// public booking page, the booking API and the settings screens. Days are
// matched by their first three letters, so "Saturday", "saturday" and "Sat"
// all mean the same day and no spelling can silently drop one.

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const key = (s: string) => s.trim().toLowerCase().slice(0, 3);

/** "Monday, Tue,saturday" → ["mon", "tue", "sat"] */
export const dayKeys = (list: string | null | undefined) =>
  (list || "").split(",").map(key).filter(Boolean);

/** An empty list means "every day" (nothing was restricted) */
export const worksOn = (list: string | null | undefined, weekday: string) => {
  const keys = dayKeys(list);
  return !keys.length || keys.includes(key(weekday));
};

/** Strict version for the clinic's own opening days: an empty list means closed */
export const opensOn = (list: string | null | undefined, weekday: string) => dayKeys(list).includes(key(weekday));

/** Full day names, in the order of `order`, for every day the list mentions in any spelling */
export const fullDayNames = (list: string | null | undefined, order: string[] = WEEKDAYS) => {
  const keys = dayKeys(list);
  return order.filter(d => keys.includes(key(d)));
};

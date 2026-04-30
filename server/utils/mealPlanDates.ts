const MEAL_PLAN_TIME_ZONE = process.env.MEAL_PLAN_TIME_ZONE || 'Europe/Zurich';

export function parseMealPlanDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function formatMealPlanDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MEAL_PLAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Failed to format meal plan date');
  }

  return `${year}-${month}-${day}`;
}

export function serializeMealSlot<T extends { date: Date | string }>(slot: T): Omit<T, 'date'> & { date: string } {
  return {
    ...slot,
    date: formatMealPlanDateKey(slot.date),
  };
}

export function serializeMealSlots<T extends { date: Date | string }>(slots: T[]): Array<Omit<T, 'date'> & { date: string }> {
  return slots.map(serializeMealSlot);
}

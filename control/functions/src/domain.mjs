// @ts-check
const DAY = 86400000;
const BOGOTA_OFFSET = 5 * 3600000;

export function initialProducts() {
  return [
    ['laparada', 'La Parada', 'business', 7],
    ['sarinbotsaas', 'Sarin Bot', 'business', 7],
    ['dialon', 'Dialon', 'person', 0],
    ['semancontrol', 'SemanControl', 'business', 0]
  ].map(([id, name, subjectKind, trialDays]) => ({ id, name, subjectKind, trialDays, connectionStatus: 'disconnected', confirmedVersion: null, plan: null }));
}

/** @param {Record<string, any>} subscription @param {Date} date */
export function renewalPeriod(subscription, date) {
  const paid = Date.parse(subscription.paidUntil || '') || 0;
  const trial = Date.parse(subscription.trialEndsAt || '') || 0;
  const start = Math.max(date.getTime(), paid, trial);
  const local = new Date(start - BOGOTA_OFFSET);
  const calendarAnchorDay = paid >= date.getTime() && subscription.calendarAnchorDay
    ? subscription.calendarAnchorDay : local.getUTCDate();
  let end;
  if (subscription.plan.billing.mode === 'fixedDays') {
    end = start + subscription.plan.billing.days * DAY;
  } else {
    const month = local.getUTCMonth() + subscription.plan.billing.months;
    const lastDay = new Date(Date.UTC(local.getUTCFullYear(), month + 1, 0)).getUTCDate();
    end = Date.UTC(local.getUTCFullYear(), month, Math.min(calendarAnchorDay, lastDay),
      local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) + BOGOTA_OFFSET;
  }
  return { periodStart: new Date(start).toISOString(), periodEnd: new Date(end).toISOString(), calendarAnchorDay };
}

/** @param {Record<string, any>} subscription @param {Date} date */
export function accessStatus(subscription, date) {
  if (subscription.suspendedAt) return 'suspended';
  if (Date.parse(subscription.paidUntil || '') > date.getTime()) return 'active';
  if (Date.parse(subscription.trialEndsAt || '') > date.getTime()) return 'trial';
  return subscription.paidUntil || subscription.trialStartedAt ? 'expired' : 'pending';
}

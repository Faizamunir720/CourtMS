/** Registry / service request categories — routed to clerk vs court administration */
export const SERVICE_CATEGORIES = [
  {
    value: 'scheduling',
    label: 'Scheduling & hearings',
    hint: 'Hearing dates, adjournments, cause list, courtroom',
    handledBy: 'clerk',
  },
  {
    value: 'documents',
    label: 'Documents & case file',
    hint: 'Missing files, uploads, copies of orders',
    handledBy: 'clerk',
  },
  {
    value: 'portal',
    label: 'Portal & login',
    hint: 'Cannot log in, wrong case shown, technical errors',
    handledBy: 'admin',
  },
  {
    value: 'other',
    label: 'Other / escalation',
    hint: 'General inquiry sent to court administration',
    handledBy: 'admin',
  },
];

export function categoryLabel(value) {
  const c = SERVICE_CATEGORIES.find((x) => x.value === value);
  return c ? c.label : value || '—';
}

export function categoryHandledBy(value) {
  const c = SERVICE_CATEGORIES.find((x) => x.value === value);
  return c ? c.handledBy : 'admin';
}

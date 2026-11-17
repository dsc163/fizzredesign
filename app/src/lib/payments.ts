import { PaymentKey, Payments } from '@/api/client';

export const PAYMENT_METHODS: {
  key: PaymentKey;
  label: string;
  placeholder: string;
  // Turn what someone typed into a clean handle.
  normalize: (value: string) => string;
  // A link that opens the app or site to pay, when the service has one.
  link?: (handle: string) => string;
}[] = [
  {
    key: 'venmo',
    label: 'Venmo',
    placeholder: '@your-handle',
    normalize: (v) => (v ? `@${v.replace(/^@+/, '')}` : ''),
    link: (h) => `https://venmo.com/u/${h.replace(/^@/, '')}`,
  },
  {
    key: 'cashapp',
    label: 'Cash App',
    placeholder: '$yourcashtag',
    normalize: (v) => (v ? `$${v.replace(/^[$]+/, '')}` : ''),
    link: (h) => `https://cash.app/${h.startsWith('$') ? h : `$${h}`}`,
  },
  {
    key: 'zelle',
    label: 'Zelle',
    placeholder: 'Phone number or email',
    normalize: (v) => v,
  },
  {
    key: 'paypal',
    label: 'PayPal',
    placeholder: 'paypal.me username or email',
    normalize: (v) => v.replace(/^https?:\/\/(www\.)?paypal\.me\//i, '').replace(/^@/, ''),
    link: (h) => (h.includes('@') ? '' : `https://paypal.me/${h}`),
  },
  {
    key: 'applepay',
    label: 'Apple Pay',
    placeholder: 'Phone number',
    normalize: (v) => v,
  },
];

export function paymentEntries(payments: Payments | null | undefined) {
  return PAYMENT_METHODS.filter((m) => payments?.[m.key]).map((m) => {
    const handle = payments![m.key]!;
    return { ...m, handle, url: m.link?.(handle) || null };
  });
}

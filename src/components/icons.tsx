/** Иконки интерфейса (inline SVG, цвет — currentColor). */

export const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.78 15.27 9.4 20.6c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.54 1.65.26 1.91-.89l3.47-16.24c.31-1.43-.52-1.99-1.46-1.64L1.83 10.6c-1.39.54-1.37 1.31-.24 1.66l5.2 1.62 12.08-7.6c.57-.38 1.09-.17.66.21z" />
  </svg>
);

export const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = ({ size = 14, width = 2.2 }: { size?: number; width?: number }) => (
  <svg viewBox="0 0 14 14" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7.3l2.6 2.6L11 4.5" />
  </svg>
);

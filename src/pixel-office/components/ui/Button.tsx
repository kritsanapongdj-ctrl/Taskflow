import type { ButtonHTMLAttributes } from 'react';

const base = 'border-2 rounded-none cursor-pointer';

const sizes = {
  sm: 'py-0.5 px-2 text-xs',
  md: 'py-1 px-2.5 text-xs',
  lg: 'py-1.5 px-3 text-sm',
  xl: 'py-2 px-4 text-base',
  icon: 'p-0 w-6 h-6 flex items-center justify-center text-xs',
  icon_lg: 'p-0 w-8 h-8 flex items-center justify-center text-sm',
} as const;

const variants = {
  default: `${base} bg-btn-bg border-transparent hover:bg-btn-hover`,
  active: `${base} bg-active-bg border-accent`,
  disabled: `${base} bg-btn-bg border-transparent cursor-default opacity-[var(--btn-disabled-opacity)]`,
  accent: `${base} bg-accent! hover:bg-accent-bright! border-accent hover:border-accent-bright`,
  ghost: `${base} bg-transparent text-text-muted border-transparent hover:text-text`,
} as const;

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'default',
  size = 'lg',
  className = '',
  ...props
}: ButtonProps) {
  return <button className={`${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

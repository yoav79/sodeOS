import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    // Estilos base requeridos por la guía de diseño
    const baseStyles = 'inline-flex items-center justify-center gap-2 transition font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    // Variantes de color y apariencia
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 rounded-xl',
      secondary: 'border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-sm rounded-xl',
      danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-500/10 hover:shadow-red-500/20 rounded-xl',
      ghost: 'text-slate-600 hover:bg-slate-100/80 active:bg-slate-100 hover:text-slate-900 rounded-xl',
      link: 'text-blue-600 hover:text-blue-700 hover:underline p-0 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:hover:no-underline'
    };

    // Tamaños
    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-xl',
      lg: 'px-5 py-2.5 text-base rounded-xl',
      icon: 'p-2.5 rounded-xl aspect-square flex-shrink-0'
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? true : undefined}
        className={cn(
          baseStyles,
          variants[variant],
          variant !== 'link' && sizes[size],
          className
        )}
        {...props}
      >
        {/* Spinner de carga si loading está activo */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Icono de la izquierda (solo si no está cargando) */}
        {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}

        {/* Contenido (Children) */}
        {children && <span className="truncate">{children}</span>}

        {/* Icono de la derecha */}
        {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

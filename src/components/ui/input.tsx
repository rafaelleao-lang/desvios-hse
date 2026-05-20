import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2',
        'text-sm text-zinc-100 placeholder:text-zinc-600',
        'ring-offset-zinc-950 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }

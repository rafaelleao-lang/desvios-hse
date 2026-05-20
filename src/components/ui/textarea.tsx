import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3',
        'text-sm text-zinc-100 placeholder:text-zinc-600 resize-y',
        'ring-offset-zinc-950 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }

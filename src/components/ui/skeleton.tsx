import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl bg-zinc-800/60 shimmer',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }

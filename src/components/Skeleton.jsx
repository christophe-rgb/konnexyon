import clsx from 'clsx'

export function Skeleton({ className }) {
  return (
    <div className={clsx('animate-pulse rounded-xl bg-surface2', className)} />
  )
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-surface border border-[rgba(201,168,76,0.1)] rounded-2xl overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full mt-1" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-3 mt-3">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="flex-1 h-10" />
        </div>
      </div>
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-surface border border-[rgba(201,168,76,0.1)] rounded-2xl p-4">
      <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
    </div>
  )
}

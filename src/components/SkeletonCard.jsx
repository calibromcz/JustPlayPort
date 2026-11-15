import React from 'react'
import { Loader2 } from 'lucide-react'

export function SkeletonCard({ shopName }) {
  return (
    <div className="apple-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between border border-stone-200/60 bg-white/70 animate-pulse relative overflow-hidden">
      {/* Shimmer gradient line */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-stone-100/60 to-transparent" />

      <div>
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-200/80 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
            </div>
            <div>
              <div className="h-4 w-28 bg-stone-200 rounded-md mb-1.5" />
              <div className="h-3 w-16 bg-stone-100 rounded-md" />
            </div>
          </div>
          <div className="h-5 w-14 bg-stone-100 rounded-full" />
        </div>

        {/* Price box skeleton */}
        <div className="my-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
          <div className="flex items-baseline justify-between mb-2">
            <div className="h-3 w-16 bg-stone-200 rounded-sm" />
            <div className="h-3 w-12 bg-stone-200 rounded-sm" />
          </div>
          <div className="h-8 w-24 bg-stone-200 rounded-lg" />
        </div>

        {/* Shipping skeleton */}
        <div className="h-4 w-36 bg-stone-100 rounded-md my-2" />
      </div>

      {/* Button skeleton */}
      <div className="mt-4 pt-3 border-t border-stone-100">
        <div className="h-11 w-full bg-stone-200/70 rounded-xl" />
      </div>
    </div>
  )
}

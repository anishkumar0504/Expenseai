import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 w-28 bg-white/10 rounded-md animate-shimmer" />
            <div className="h-5 w-16 bg-white/10 rounded-full animate-shimmer" />
          </div>
          <div className="h-10 w-44 bg-white/10 rounded-lg my-3 animate-shimmer" />
          <div className="h-3 w-36 bg-white/5 rounded-md animate-shimmer" />
        </div>

        <div className="h-44 rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 w-24 bg-white/10 rounded-md animate-shimmer" />
            <div className="h-4 w-4 bg-white/10 rounded-full animate-shimmer" />
          </div>
          <div className="grid grid-cols-2 gap-2 my-2">
            <div className="h-9 bg-white/10 rounded-xl animate-shimmer" />
            <div className="h-9 bg-white/10 rounded-xl animate-shimmer" />
          </div>
          <div className="h-3 w-32 bg-white/5 rounded-md animate-shimmer" />
        </div>
      </div>

      {/* Transactions Feed Skeleton */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-3">
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-36 bg-white/10 rounded-md animate-shimmer" />
          <div className="h-8 w-24 bg-white/10 rounded-xl animate-shimmer" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 animate-shimmer" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-white/10 rounded-md animate-shimmer" />
                <div className="h-3 w-20 bg-white/5 rounded-md animate-shimmer" />
              </div>
            </div>
            <div className="h-5 w-16 bg-white/10 rounded-md animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
};

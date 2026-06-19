import React from "react";

export const PostSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-[#fafeff] dark:bg-[#242526] rounded-xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800 animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex-1 space-y-2">
          <div className="w-1/3 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="w-1/4 h-3 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2">
        <div className="w-full h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="w-5/6 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      {/* Image if any */}
      <div className="w-full h-48 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div className="w-1/4 h-6 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="w-1/4 h-6 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="w-1/4 h-6 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
};

export const FriendSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg animate-pulse">
      <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      <div className="flex-1 space-y-2">
        <div className="w-1/2 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="w-1/3 h-3 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 animate-pulse select-none">
      {/* Cover Banner Skeleton */}
      <div className="relative bg-white dark:bg-[#242526] border-b border-neutral-200 dark:border-neutral-800 rounded-b-xl overflow-hidden shadow-sm">
        <div className="h-48 sm:h-64 md:h-80 bg-neutral-200 dark:bg-neutral-850" />
        <div className="px-4 pb-6 flex flex-col md:flex-row items-center md:items-end md:space-x-6 relative -mt-16 md:-mt-20 md:px-8">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-[#242526] bg-neutral-300 dark:bg-neutral-700 relative shrink-0" />
          <div className="flex-1 text-center md:text-left space-y-3 mt-4 md:mt-0">
            <div className="w-48 h-6 bg-neutral-300 dark:bg-neutral-700 rounded mx-auto md:mx-0" />
            <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 rounded mx-auto md:mx-0" />
          </div>
          <div className="w-36 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl mt-4 md:mt-0" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Left bio card skeleton */}
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="w-24 h-4 bg-neutral-300 dark:bg-neutral-750 rounded" />
            <div className="space-y-2">
              <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="w-5/6 h-3 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="w-full h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
              <div className="w-full h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Center chronological posts skeleton */}
        <div className="md:col-span-2 space-y-6">
          <div className="w-full h-40 bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-700 shrink-0" />
              <div className="flex-1 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex justify-around">
              <div className="w-20 h-5 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="w-20 h-5 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    </div>
  );
};

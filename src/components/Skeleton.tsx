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

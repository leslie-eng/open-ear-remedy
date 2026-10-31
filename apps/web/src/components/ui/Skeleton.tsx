interface SkeletonProps {
  className?: string;
}

/** Soft shimmer placeholder. Size it with Tailwind classes (e.g. "h-10 w-16"). */
export default function Skeleton({ className = '' }: SkeletonProps) {
  return <span aria-hidden="true" className={`oe-skeleton block ${className}`} />;
}

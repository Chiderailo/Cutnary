/**
 * StatusBadge - Displays job processing status with appropriate styling
 * Used in the processing steps area to show current state
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface StatusBadgeProps {
  status: JobStatus
  label?: string
  /** Show checkmark or spinner for active states */
  showIcon?: boolean
}

const statusConfig: Record<
  JobStatus,
  { bg: string; text: string; border: string; icon?: string }
> = {
  pending: {
    bg: 'bg-zinc-800/50',
    text: 'text-zinc-400',
    border: 'border-zinc-600/50',
    icon: '○',
  },
  processing: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/50',
    icon: '◐',
  },
  completed: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    icon: '✓',
  },
  failed: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    icon: '✕',
  },
}

export default function StatusBadge({
  status,
  label,
  showIcon = true,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium
        ${config.bg} ${config.text} ${config.border}
      `}
    >
      {showIcon && (
        <span
          className={
            status === 'processing'
              ? 'animate-spin text-base'
              : 'text-base leading-none'
          }
        >
          {config.icon}
        </span>
      )}
      {displayLabel}
    </span>
  )
}

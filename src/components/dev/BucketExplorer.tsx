/**
 * Dev Bucket Explorer (safe placeholder)
 * Prevents invalid element errors when imported by Resources page.
 */

import React from 'react'

/** Props for the BucketExplorer placeholder */
interface BucketExplorerProps {
  /** Controls visibility; currently no UI rendered when false */
  open?: boolean
  /** Change handler for visibility state */
  onOpenChange?: (open: boolean) => void
}

/**
 * Minimal safe component:
 * - Returns null when closed
 * - Returns a tiny hidden node when open (non-intrusive)
 */
const BucketExplorer: React.FC<BucketExplorerProps> = ({ open }) => {
  if (!open) return null
  return <div aria-hidden className="hidden" />
}

export default BucketExplorer

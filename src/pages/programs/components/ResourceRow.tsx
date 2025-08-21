/**
 * ResourceRow
 * Dense horizontal row item for a resource with name, meta, and a compact CTA.
 */

import React from 'react'
import { Button } from '../../../components/ui/button'
import { Download } from 'lucide-react'
import { ResourceItem } from '../../../services/api/types'

/** Props for ResourceRow */
interface ResourceRowProps {
  /** Resource to render */
  item: ResourceItem
}

/**
 * ResourceRow component
 * Small, compact, desktop-friendly row for dense lists.
 */
const ResourceRow: React.FC<ResourceRowProps> = ({ item }) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-slate-50">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{item.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {item.type ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.type}</span>
          ) : null}
          {item.category ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.category}</span>
          ) : null}
          {item.sizeMB ? <span>{item.sizeMB} MB</span> : null}
          {item.lastUpdatedISO ? (
            <span>Updated {new Date(item.lastUpdatedISO).toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>
      <div className="flex-shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="min-w-[110px]"
          asChild={!!item.fileUrl}
          disabled={!item.fileUrl}
        >
          {item.fileUrl ? (
            <a href={item.fileUrl} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default ResourceRow

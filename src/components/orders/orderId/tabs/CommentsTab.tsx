import { FileText } from 'lucide-react'
import type { OrderPackage } from '@/routes/orders/$orderId'

export interface PackageComment {
  id: string
  text: string
  author: string
  created_at: string
}

interface CommentsTabProps {
  selectedPackage: OrderPackage
}

export function CommentsTab({ selectedPackage }: CommentsTabProps) {
  return (
    <div>
      {selectedPackage.comments && selectedPackage.comments.length > 0 ? (
        <div className="space-y-3">
          {selectedPackage.comments.map((comment, index) => (
            <div key={comment.id || index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{comment.author || 'Unknown'}</span>
                <span className="text-xs text-gray-500">
                  {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </span>
              </div>
              <p className="text-gray-700">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No comments for this package</p>
        </div>
      )}
    </div>
  )
}

import { Edit, Trash2 } from 'lucide-react'
import type { Supplier } from './types'

interface SuppliersTableProps {
  suppliers: Supplier[]
  onEditSupplier: (supplier: Supplier) => void
  onDeleteSupplier: (supplier: Supplier) => void
}

export function SuppliersTable({ suppliers, onEditSupplier, onDeleteSupplier }: SuppliersTableProps) {
  return (
    <table className="excel-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Address</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((supplier) => (
          <tr key={supplier.id}>
            <td>
              <span className="font-medium text-gray-900">{supplier.name}</span>
            </td>
            <td>
              <span className="text-gray-600">{supplier.contact_person || '—'}</span>
            </td>
            <td>
              <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                {supplier.email || '—'}
              </a>
            </td>
            <td>
              <span className="text-gray-600">{supplier.phone || '—'}</span>
            </td>
            <td>
              <span className="text-gray-500 max-w-xs truncate block">
                {supplier.address || '—'}
              </span>
            </td>
            <td>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditSupplier(supplier)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => onDeleteSupplier(supplier)}
                  className="p-1.5 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

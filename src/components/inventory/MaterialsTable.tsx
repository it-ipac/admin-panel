import React from 'react'
import { ChevronDown, ChevronUp, Edit, Trash2, Truck } from 'lucide-react'
import type { Material, MaterialVariant } from './types'

interface MaterialsTableProps {
  materials: Material[]
  expandedMaterials: Set<string>
  onToggleExpand: (materialId: string) => void
  onEditMaterial: (material: Material) => void
  onDeleteMaterial: (material: Material) => void
  onEditVariant: (variant: MaterialVariant) => void
  onDeleteVariant: (variant: MaterialVariant) => void
  formatDate: (value?: string | null) => string
}

/**
 * MaterialsTable
 * 
 * Renders materials and nested variants in a dedicated component so the
 * route stays focused on orchestration and data fetching.
 */
export function MaterialsTable({
  materials,
  expandedMaterials,
  onToggleExpand,
  onEditMaterial,
  onDeleteMaterial,
  onEditVariant,
  onDeleteVariant,
  formatDate,
}: MaterialsTableProps) {
  return (
    <table className="excel-table">
      <thead>
        <tr>
          <th className="w-10"></th>
          <th>Material Name</th>
          <th>Description</th>
          <th>Unit</th>
          <th>Variants</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {materials.map((material) => {
          const isExpanded = expandedMaterials.has(material.id)
          const variantCount = material.material_variants?.length || 0
          const hasVariants = variantCount > 0

          return (
            <React.Fragment key={material.id}>
              <tr
                className={`cursor-pointer ${hasVariants ? 'hover:bg-blue-50' : ''} ${isExpanded ? 'bg-blue-50' : ''}`}
                onClick={() => hasVariants && onToggleExpand(material.id)}
              >
                <td className="text-center">
                  {hasVariants && (
                    isExpanded
                      ? <ChevronUp className="w-4 h-4 text-blue-600 inline" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 inline" />
                  )}
                </td>
                <td className="font-medium text-gray-900">{material.name}</td>
                <td className="text-gray-500 max-w-xs truncate">
                  {material.description || '—'}
                </td>
                <td>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {material.unit?.name || '—'}
                  </span>
                </td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    hasVariants ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {variantCount}
                  </span>
                </td>
                <td className="text-sm text-gray-500">
                  {formatDate(material.created_at)}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditMaterial(material)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => onDeleteMaterial(material)}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>

              {isExpanded && hasVariants && (
                <tr className="bg-gray-100 border-l-4 border-l-blue-500">
                  <td colSpan={7} className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-600 uppercase">
                          <th className="px-4 py-2 text-left w-48">Variant Name</th>
                          <th className="px-4 py-2 text-left w-40">Description</th>
                          <th className="px-4 py-2 text-left w-32">Dimensions (L×W×T)</th>
                          <th className="px-4 py-2 text-left w-32">Supplier</th>
                          <th className="px-4 py-2 text-right w-28">Supplier Qty</th>
                          <th className="px-4 py-2 text-right w-24">Price</th>
                          <th className="px-4 py-2 text-right w-28">Price/Unit</th>
                          <th className="px-4 py-2 text-left w-32">Last Updated</th>
                          <th className="px-4 py-2 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {material.material_variants?.map((variant) => {
                          const hasPricing = variant.supplier_pricing && variant.supplier_pricing.length > 0

                          if (!hasPricing) {
                            return (
                              <tr key={variant.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-gray-800">{variant.variant_name}</td>
                                <td className="px-4 py-2 text-gray-500 text-sm">{variant.description || '—'}</td>
                                <td className="px-4 py-2 text-gray-500 text-sm font-mono">
                                  {variant.length || variant.width || variant.thickness
                                    ? `${variant.length || '—'} × ${variant.width || '—'} × ${variant.thickness || '—'}`
                                    : '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-400 italic text-sm">No supplier</td>
                                <td className="px-4 py-2 text-right text-gray-400">—</td>
                                <td className="px-4 py-2 text-right text-gray-400">—</td>
                                <td className="px-4 py-2 text-right text-gray-400">—</td>
                                <td className="px-4 py-2 text-gray-400 text-sm">—</td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => onEditVariant(variant)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteVariant(variant)}
                                      className="p-1 hover:bg-red-50 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          }

                          return variant.supplier_pricing?.map((pricing, pIdx) => (
                            <tr
                              key={`${variant.id}-${pricing.id}`}
                              className={`bg-white border-b border-gray-100 hover:bg-gray-50 ${pIdx > 0 ? 'border-t-0' : ''}`}
                            >
                              {pIdx === 0 ? (
                                <>
                                  <td className="px-4 py-2 font-medium text-gray-800" rowSpan={variant.supplier_pricing!.length}>
                                    {variant.variant_name}
                                  </td>
                                  <td className="px-4 py-2 text-gray-500 text-sm" rowSpan={variant.supplier_pricing!.length}>
                                    {variant.description || '—'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-500 text-sm font-mono" rowSpan={variant.supplier_pricing!.length}>
                                    {variant.length || variant.width || variant.thickness
                                      ? `${variant.length || '—'} × ${variant.width || '—'} × ${variant.thickness || '—'}`
                                      : '—'}
                                  </td>
                                </>
                              ) : null}
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                  <Truck className="w-3 h-3" />
                                  {pricing.suppliers?.name || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className="font-medium text-gray-700">
                                  {pricing.supplier_quantity != null ? pricing.supplier_quantity : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className="font-medium text-green-600">
                                  {pricing.price != null ? `AED ${pricing.price.toFixed(2)}` : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className="text-gray-600">
                                  {pricing.price_per_unit != null ? `AED ${pricing.price_per_unit.toFixed(2)}` : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-sm">
                                {pricing.updated_at
                                  ? new Date(pricing.updated_at).toLocaleDateString()
                                  : '—'}
                              </td>
                              {pIdx === 0 && (
                                <td className="px-4 py-2 text-center" rowSpan={variant.supplier_pricing!.length}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => onEditVariant(variant)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteVariant(variant)}
                                      className="p-1 hover:bg-red-50 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        })}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

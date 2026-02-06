import { useState } from 'react'
import { Plus, Edit, Trash2, Check, X, Loader2, Wrench } from 'lucide-react'
import type { PackageMaterial } from '@/routes/orders/$orderId'

interface SecuringTabProps {
  selectedPackageMaterials: {
    accessories: PackageMaterial[]
    securing: PackageMaterial[]
  }
  updatePackageMaterialMutation: any
  deletePackageMaterialMutation: any
  setMaterialType: (type: string) => void
  resetMaterialForm: () => void
  setShowAddMaterialModal: (show: boolean) => void
}

export function SecuringTab({ 
  selectedPackageMaterials,
  updatePackageMaterialMutation, 
  deletePackageMaterialMutation,
  setMaterialType,
  resetMaterialForm,
  setShowAddMaterialModal
}: SecuringTabProps) {
  const [editingMaterial, setEditingMaterial] = useState<PackageMaterial | null>(null)
  const [materialForm, setMaterialForm] = useState({
    material_variant_id: '',
    quantity: 1,
    unit_id: '',
    length: '',
    width: '',
    height: '',
    comment: '',
    is_final: false,
  })

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return
    
    await updatePackageMaterialMutation.mutateAsync({
      id: editingMaterial.id,
      quantity: materialForm.quantity,
      length: materialForm.length !== '' ? Number(materialForm.length) : null,
      width: materialForm.width !== '' ? Number(materialForm.width) : null,
      height: materialForm.height !== '' ? Number(materialForm.height) : null,
      comment: materialForm.comment || null,
      is_final: materialForm.is_final,
    })
    
    setEditingMaterial(null)
    setMaterialForm({
      material_variant_id: '',
      quantity: 1,
      unit_id: '',
      length: '',
      width: '',
      height: '',
      comment: '',
      is_final: false,
    })
  }

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('Are you sure you want to delete this material?')) {
      await deletePackageMaterialMutation.mutateAsync(id)
    }
  }

  const startEditMaterial = (material: PackageMaterial) => {
    setEditingMaterial(material)
    setMaterialForm({
      material_variant_id: material.material_variant_id,
      quantity: material.quantity,
      unit_id: material.unit_id || '',
      length: material.length !== null && material.length !== undefined ? String(material.length) : '',
      width: material.width !== null && material.width !== undefined ? String(material.width) : '',
      height: material.height !== null && material.height !== undefined ? String(material.height) : '',
      comment: material.comment || '',
      is_final: material.is_final,
    })
  }

  return (
    <div>
      {/* Add Securing Material Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            resetMaterialForm()
            setMaterialType('Securing')
            setShowAddMaterialModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Securing Material
        </button>
      </div>

      {selectedPackageMaterials.securing.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Material</th>
                <th className="text-center py-3 px-4 font-semibold">Qty</th>
                <th className="text-center py-3 px-4 font-semibold">Dimensions</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Comment</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedPackageMaterials.securing.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  {editingMaterial?.id === material.id ? (
                    <>
                      <td className="py-2 px-4">
                        <span className="font-medium">{material.variant_name}</span>
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" value={materialForm.quantity} onChange={(e) => setMaterialForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="w-16 px-2 py-1 border rounded text-sm text-center" min={1} />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1 justify-center">
                          <input type="number" placeholder="L" value={materialForm.length} onChange={(e) => setMaterialForm(f => ({ ...f, length: e.target.value }))} className="w-12 px-1 py-1 border rounded text-sm text-center" />
                          <span>×</span>
                          <input type="number" placeholder="W" value={materialForm.width} onChange={(e) => setMaterialForm(f => ({ ...f, width: e.target.value }))} className="w-12 px-1 py-1 border rounded text-sm text-center" />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <label className="flex items-center justify-center gap-1 text-xs">
                          <input type="checkbox" checked={materialForm.is_final} onChange={(e) => setMaterialForm(f => ({ ...f, is_final: e.target.checked }))} />
                          Final
                        </label>
                      </td>
                      <td className="py-2 px-4">
                        <input type="text" value={materialForm.comment} onChange={(e) => setMaterialForm(f => ({ ...f, comment: e.target.value }))} className="w-full px-2 py-1 border rounded text-sm" placeholder="Comment" />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1 justify-center">
                          <button onClick={handleUpdateMaterial} disabled={updatePackageMaterialMutation.isPending} className="p-1 text-green-600 hover:bg-green-100 rounded">
                            {updatePackageMaterialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingMaterial(null)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4">
                        <span className="font-medium">{material.variant_name}</span>
                        {material.material_name && (
                          <span className="text-gray-500 text-xs ml-1">({material.material_name})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {material.quantity}{material.unit_name ? ` ${material.unit_name}` : ''}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {material.length || material.width ? (
                          `${material.length ?? '—'} × ${material.width ?? '—'}${material.height ? ` × ${material.height}` : ''}`
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          material.is_final 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {material.is_final ? 'Final' : 'Planned'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {material.comment || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => startEditMaterial(material)} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMaterial(material.id)} disabled={deletePackageMaterialMutation.isPending} className="p-1 text-red-600 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No securing materials for this package</p>
        </div>
      )}
    </div>
  )
}

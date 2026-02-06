import { useQuery, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { TwoTierCard } from '../../../ui/TwoTierCard'
import { DimensionsCard } from '../../../ui/DimensionsCard'
import type { OrderPackage, PackageInfo } from '../../../../routes/orders/$orderId'

interface PackageInfoTabProps {
  selectedPackage: OrderPackage
  updatePackageStatusMutation: UseMutationResult<void, Error, { packageId: string; status: string }>
  updatePackageInfoMutation: UseMutationResult<PackageInfo, Error, { 
    packageId: string
    infoType: 'original' | 'final'
    updates: Partial<PackageInfo>
  }>
  getStatusColor: (status: string) => string
}

export function PackageInfoTab({
  selectedPackage,
  updatePackageStatusMutation,
  updatePackageInfoMutation,
  getStatusColor,
}: PackageInfoTabProps) {
  
  const { data: packingTypes } = useQuery({
    queryKey: ['packingTypes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packing_types').select('id, code, name')
      if (error) throw error
      return data
    }
  })

  const { data: boxTypes } = useQuery({
    queryKey: ['boxTypes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('box_type').select('id, name')
      if (error) throw error
      return data
    }
  })

  const packingTypeOptions = packingTypes?.map(t => ({ label: `${t.code} - ${t.name}`, value: t.id })) || []
  const boxTypeOptions = boxTypes?.map(t => ({ label: t.name, value: t.id })) || []

  const getPackingTypeName = (id: string | null | undefined) => {
    if (!id) return null
    const t = packingTypes?.find(t => t.id === id)
    return t ? `${t.code} - ${t.name}` : id
  }

  const getBoxTypeName = (id: string | null | undefined) => {
    if (!id) return null
    const t = boxTypes?.find(t => t.id === id)
    return t ? t.name : id
  }

  const handleUpdate = (field: keyof PackageInfo, value: any) => {
    updatePackageInfoMutation.mutate({
      packageId: selectedPackage.id,
      infoType: 'final',
      updates: { [field]: value }
    })
  }

  const isPacked = selectedPackage.status === 'packed'

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Box #{selectedPackage.package_number}</h3>
          <p className="text-gray-500 text-sm">{selectedPackage.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-2">
           {/* Status Badge/Select could go here if needed, but sticking to UI replication */}
        </div>
      </div>

      {/* Package Info Cards */}
      <div className="flex flex-row flex-wrap gap-1">
        <TwoTierCard
          label="Quantity"
          original={selectedPackage.original_pkg_info?.quantity}
          final={selectedPackage.final_pkg_info?.quantity}
          type="number"
          onChange={(v) => handleUpdate('quantity', v)}
          editable={!isPacked}
        />
        <TwoTierCard
          label="S.E.I"
          original={getPackingTypeName(selectedPackage.original_pkg_info?.packing_type_id)}
          final={selectedPackage.final_pkg_info?.packing_type_id}
          type="select"
          selectItems={packingTypeOptions}
          onChange={(v) => handleUpdate('packing_type_id', v)}
          editable={!isPacked}
        />
        <TwoTierCard
          label="Box Type"
          original={getBoxTypeName(selectedPackage.original_pkg_info?.box_type_id)}
          final={selectedPackage.final_pkg_info?.box_type_id}
          type="select"
          selectItems={boxTypeOptions}
          onChange={(v) => handleUpdate('box_type_id', v)}
          editable={!isPacked}
          className="flex-[1.3]"
        />
        <TwoTierCard
          label="Tare"
          original={selectedPackage.original_pkg_info?.tare}
          final={selectedPackage.final_pkg_info?.tare}
          type="number"
          onChange={(v) => handleUpdate('tare', v)}
          editable={!isPacked}
          className="flex-[1.2]"
        />
        <TwoTierCard
          label="Net Weight"
          original={selectedPackage.original_pkg_info?.net_weight}
          final={selectedPackage.final_pkg_info?.net_weight}
          type="number"
          onChange={(v) => handleUpdate('net_weight', v)}
          editable={!isPacked}
          className="flex-[1.3]"
        />
        <TwoTierCard
          label="Gross Weight"
          original={selectedPackage.original_pkg_info?.gross_weight}
          final={selectedPackage.final_pkg_info?.gross_weight}
          type="number"
          onChange={(v) => handleUpdate('gross_weight', v)}
          editable={!isPacked}
          className="flex-[1.3]"
        />
        <TwoTierCard
          label="Center of Gravity"
          original={selectedPackage.original_pkg_info?.center_of_gravity ? String(selectedPackage.original_pkg_info.center_of_gravity) : null}
          final={selectedPackage.final_pkg_info?.center_of_gravity ? String(selectedPackage.final_pkg_info.center_of_gravity) : null}
          type="switch"
          onChange={(v) => handleUpdate('center_of_gravity', v)}
          editable={!isPacked}
        />
      </div>

      {/* Dimensions Cards */}
      <div className="flex flex-row flex-wrap gap-1 mt-4">
        <DimensionsCard
          heading="Internal Dimensions"
          original={{
            length: selectedPackage.original_pkg_info?.internal_length ?? null,
            width: selectedPackage.original_pkg_info?.internal_width ?? null,
            height: selectedPackage.original_pkg_info?.internal_height ?? null,
          }}
          final={{
            length: selectedPackage.final_pkg_info?.internal_length ?? null,
            width: selectedPackage.final_pkg_info?.internal_width ?? null,
            height: selectedPackage.final_pkg_info?.internal_height ?? null,
          }}
          onChangeFinal={(patch) => {
            if (patch.length !== undefined) handleUpdate('internal_length', patch.length)
            if (patch.width !== undefined) handleUpdate('internal_width', patch.width)
            if (patch.height !== undefined) handleUpdate('internal_height', patch.height)
          }}
        />
        <DimensionsCard
          heading="External Dimensions"
          original={{
            length: selectedPackage.original_pkg_info?.external_length ?? null,
            width: selectedPackage.original_pkg_info?.external_width ?? null,
            height: selectedPackage.original_pkg_info?.external_height ?? null,
          }}
          final={{
            length: selectedPackage.final_pkg_info?.external_length ?? null,
            width: selectedPackage.final_pkg_info?.external_width ?? null,
            height: selectedPackage.final_pkg_info?.external_height ?? null,
          }}
          onChangeFinal={(patch) => {
            if (patch.length !== undefined) handleUpdate('external_length', patch.length)
            if (patch.width !== undefined) handleUpdate('external_width', patch.width)
            if (patch.height !== undefined) handleUpdate('external_height', patch.height)
          }}
        />
      </div>
    </div>
  )
}

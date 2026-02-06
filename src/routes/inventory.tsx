import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '../components/Sidebar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Search,
  Plus,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  Boxes,
  Truck,
  Trash2,
  Copy,
} from 'lucide-react'
import { MaterialsTable } from '../components/inventory/MaterialsTable'
import { VariantsTable } from '../components/inventory/VariantsTable'
import { SuppliersTable } from '../components/inventory/SuppliersTable'
import type {
  Material,
  MaterialVariant,
  Supplier,
  TabType,
  TagItem,
  Unit,
  VariantTag,
} from '../components/inventory/types'

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
})


function InventoryPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('materials')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editData, setEditData] = useState<any>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'edit' | 'delete'>('edit')
  const [modalEntity, setModalEntity] = useState<TabType | null>(null)
  const [modalItem, setModalItem] = useState<any>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deleteImpact, setDeleteImpact] = useState({
    variants: 0,
    supplierPricings: 0,
    orderRefs: 0,
    supplierRefs: 0,
  })
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false)
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set())
  const perPage = 15

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [user, authLoading, navigate])

  // Fetch materials with variants and supplier pricing
  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['materials-with-variants'],
    queryFn: async () => {
      // Fetch base materials
      const { data: mats, error: matsErr } = await supabase
        .from('materials')
        .select('id, name, description, unit_id, created_at')
        .order('name')
      if (matsErr) throw matsErr

      // Fetch units
      const { data: unitsData, error: unitsErr } = await supabase
        .from('units_of_measure')
        .select('id, name, description')
      if (unitsErr) throw unitsErr
      const unitMap = new Map((unitsData || []).map((u: Unit) => [u.id, u]))

      // Fetch all variants
      const matIds = (mats || []).map((m: Material) => m.id)
      let variants: any[] = []
      let variantPricing: any[] = []
      let variantTagsMap = new Map<string, VariantTag[]>()

      if (matIds.length > 0) {
        const { data: vars, error: varsErr } = await supabase
          .from('material_variants')
          .select('id, material_id, variant_name, description, unit_id, length, width, thickness, created_at')
          .in('material_id', matIds)
        if (varsErr) throw varsErr
        variants = vars || []

        // Fetch supplier pricing for all variants
        const variantIds = variants.map((v: MaterialVariant) => v.id)
        if (variantIds.length > 0) {
          const { data: pricing, error: pricingErr } = await supabase
            .from('supplier_pricing')
            .select(`
              id,
              material_variant_id,
              supplier_id,
              price,
              price_per_unit,
              supplier_quantity,
              updated_at,
              suppliers (
                id,
                name,
                contact_person
              )
            `)
            .in('material_variant_id', variantIds)
            .order('price')
          if (!pricingErr) {
            variantPricing = pricing || []
          }

          // Fetch variant tags
          const { data: variantTags, error: variantTagsErr } = await supabase
            .from('material_variant_tags')
            .select('material_variant_id, tag_id, tags(id, name)')
            .in('material_variant_id', variantIds)
          if (!variantTagsErr && variantTags) {
            variantTags.forEach((vt: any) => {
              const arr = variantTagsMap.get(vt.material_variant_id) || []
              arr.push({ tag_id: vt.tag_id, tags: vt.tags })
              variantTagsMap.set(vt.material_variant_id, arr)
            })
          }
        }
      }

      // Assemble materials with variants and pricing
      const materialRows = (mats || []).map((m: any) => {
        const materialVariants = variants
          .filter((v: any) => v.material_id === m.id)
          .map((v: any) => ({
            ...v,
            unit: v.unit_id ? unitMap.get(v.unit_id) : null,
            supplier_pricing: variantPricing.filter((p: any) => p.material_variant_id === v.id),
            material_variant_tags: variantTagsMap.get(v.id) || [],
          }))

        return {
          ...m,
          unit: m.unit_id ? unitMap.get(m.unit_id) : null,
          material_variants: materialVariants,
        }
      })

      return materialRows as Material[]
    },
    enabled: !!user,
    staleTime: 30000,
  })

  // Fetch suppliers
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Supplier[]
    },
    enabled: !!user,
    staleTime: 30000,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data as TagItem[]
    },
    enabled: !!user,
    staleTime: 60000,
  })

  // Fetch units for dropdown - TODO: implement unit editing
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('id, name, description')
        .order('name')
      if (error) throw error
      return data as Unit[]
    },
    enabled: !!user,
    staleTime: 60000,
  })

  const updateMaterial = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Material> }) => {
      const { error } = await supabase
        .from('materials')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-with-variants'] })
      setModalOpen(false)
    },
  })

  const updateVariant = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaterialVariant> }) => {
      const { error } = await supabase
        .from('material_variants')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-with-variants'] })
    },
  })

  // Update supplier mutation
  const updateSupplier = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Supplier> }) => {
      const { error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setModalOpen(false)
    },
  })

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-with-variants'] })
      setModalOpen(false)
    },
  })

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('material_variants').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-with-variants'] })
      setModalOpen(false)
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setModalOpen(false)
    },
  })

  // Filter materials based on search (also search in variants)
  const filteredMaterials = useMemo(() => {
    if (!materialsData) return []
    return materialsData.filter(m => {
      const matchesMaterial = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase())
      const matchesVariant = m.material_variants?.some(v => 
        v.variant_name.toLowerCase().includes(search.toLowerCase()) ||
        v.description?.toLowerCase().includes(search.toLowerCase())
      )
      return matchesMaterial || matchesVariant
    })
  }, [materialsData, search])

  // Flatten all variants for the Variants tab with material info attached
  const allVariants = useMemo(() => {
    if (!materialsData) return []
    const variants: (MaterialVariant & { material?: Material })[] = []
    materialsData.forEach(m => {
      m.material_variants?.forEach(v => {
        variants.push({
          ...v,
          material: { id: m.id, name: m.name, description: m.description, unit_id: m.unit_id, created_at: m.created_at, unit: m.unit },
        })
      })
    })
    return variants
  }, [materialsData])

  // Filter variants for the Variants tab
  const filteredVariants = useMemo(() => {
    if (!allVariants) return []
    return allVariants.filter(v =>
      v.variant_name.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase()) ||
      v.material?.name.toLowerCase().includes(search.toLowerCase()) ||
      v.material_variant_tags?.some(t => t.tags?.name.toLowerCase().includes(search.toLowerCase()))
    )
  }, [allVariants, search])

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return []
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    )
  }, [suppliers, search])

  // Pagination helpers
  const getCurrentData = () => {
    switch (activeTab) {
      case 'materials': return filteredMaterials
      case 'variants': return filteredVariants
      case 'suppliers': return filteredSuppliers
      default: return []
    }
  }

  const currentData = getCurrentData()
  const totalPages = Math.ceil(currentData.length / perPage)
  const paginatedData = currentData.slice((page - 1) * perPage, page * perPage)

  const isLoading = activeTab === 'materials' ? materialsLoading : 
    activeTab === 'variants' ? materialsLoading : suppliersLoading

  // Toggle expanded state for a material
  const toggleMaterialExpand = (materialId: string) => {
    setExpandedMaterials(prev => {
      const newSet = new Set(prev)
      if (newSet.has(materialId)) {
        newSet.delete(materialId)
      } else {
        newSet.add(materialId)
      }
      return newSet
    })
  }

  const openEditModal = (entity: TabType, item: any) => {
    setModalEntity(entity)
    setModalMode('edit')
    setModalItem(item)
    if (entity === 'variants') {
      const pricing = item?.supplier_pricing?.[0] || null
      setEditData({
        ...item,
        tag_ids: item?.material_variant_tags?.map((t: VariantTag) => t.tag_id) || [],
        supplier_pricing_id: pricing?.id || null,
        supplier_id: pricing?.supplier_id || '',
        supplier_quantity: pricing?.supplier_quantity ?? '',
        price: pricing?.price ?? '',
        price_per_unit: pricing?.price_per_unit ?? '',
      })
    } else {
      setEditData({ ...item })
    }
    setModalError(null)
    setModalOpen(true)
  }

  const openDeleteModal = async (entity: TabType, item: any) => {
    setModalEntity(entity)
    setModalMode('delete')
    setModalItem(item)
    setModalError(null)
    setDeleteImpact({ variants: 0, supplierPricings: 0, orderRefs: 0, supplierRefs: 0 })
    setDeleteImpactLoading(true)
    setModalOpen(true)

    try {
      if (entity === 'materials') {
        const { data: variants } = await supabase
          .from('material_variants')
          .select('id', { count: 'exact' })
          .eq('material_id', item.id)

        const variantIds = (variants || []).map((v: any) => v.id)
        const variantsCount = variantIds.length

        let supplierPricingCount = 0
        let orderRefsCount = 0
        if (variantIds.length > 0) {
          const { count: pricingCount } = await supabase
            .from('supplier_pricing')
            .select('id', { count: 'exact', head: true })
            .in('material_variant_id', variantIds)

          const { count: orderMatCount } = await supabase
            .from('order_package_materials')
            .select('id', { count: 'exact', head: true })
            .in('material_variant_id', variantIds)

          const { count: beamCount } = await supabase
            .from('beam')
            .select('id', { count: 'exact', head: true })
            .in('type', variantIds)

          const { count: templateCount } = await supabase
            .from('securing_template')
            .select('id', { count: 'exact', head: true })
            .in('type_id', variantIds)

          supplierPricingCount = pricingCount || 0
          orderRefsCount = (orderMatCount || 0) + (beamCount || 0) + (templateCount || 0)
        }

        setDeleteImpact({
          variants: variantsCount,
          supplierPricings: supplierPricingCount,
          orderRefs: orderRefsCount,
          supplierRefs: 0,
        })
      }

      if (entity === 'variants') {
        const { count: pricingCount } = await supabase
          .from('supplier_pricing')
          .select('id', { count: 'exact', head: true })
          .eq('material_variant_id', item.id)

        const { count: orderMatCount } = await supabase
          .from('order_package_materials')
          .select('id', { count: 'exact', head: true })
          .eq('material_variant_id', item.id)

        const { count: beamCount } = await supabase
          .from('beam')
          .select('id', { count: 'exact', head: true })
          .eq('type', item.id)

        const { count: templateCount } = await supabase
          .from('securing_template')
          .select('id', { count: 'exact', head: true })
          .eq('type_id', item.id)

        setDeleteImpact({
          variants: 0,
          supplierPricings: pricingCount || 0,
          orderRefs: (orderMatCount || 0) + (beamCount || 0) + (templateCount || 0),
          supplierRefs: 0,
        })
      }

      if (entity === 'suppliers') {
        const { count: pricingCount } = await supabase
          .from('supplier_pricing')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', item.id)

        setDeleteImpact({
          variants: 0,
          supplierPricings: 0,
          orderRefs: 0,
          supplierRefs: pricingCount || 0,
        })
      }
    } catch (error) {
      setModalError('Unable to load deletion impact. Please try again.')
    } finally {
      setDeleteImpactLoading(false)
    }
  }

  const resolveDeleteError = (error: any) => {
    const message = error?.message?.toLowerCase?.() || ''
    if (message.includes('foreign key') || message.includes('violates')) {
      return 'Cannot delete this item because it is referenced by existing orders or records. Please remove those references first.'
    }
    if (message.includes('permission')) {
      return 'You do not have permission to delete this item. Please contact an administrator.'
    }
    return 'Delete failed. Please try again or contact support.'
  }

  const handleSaveEdit = async () => {
    if (!modalEntity || !modalItem) return
    setModalError(null)

    const toNumber = (value: any) => {
      if (value === '' || value === null || value === undefined) return null
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    if (modalEntity === 'materials') {
      updateMaterial.mutate({
        id: modalItem.id,
        updates: {
          name: editData.name,
          description: editData.description,
          unit_id: editData.unit_id || null,
        },
      })
    }

    if (modalEntity === 'variants') {
      try {
        await updateVariant.mutateAsync({
          id: modalItem.id,
          updates: {
            variant_name: editData.variant_name,
            description: editData.description,
            unit_id: editData.unit_id || null,
            length: editData.length || null,
            width: editData.width || null,
            thickness: editData.thickness || null,
          },
        })

        const selectedTags = Array.isArray(editData.tag_ids) ? editData.tag_ids : []
        const { error: deleteTagsError } = await supabase
          .from('material_variant_tags')
          .delete()
          .eq('material_variant_id', modalItem.id)

        if (deleteTagsError) throw deleteTagsError

        if (selectedTags.length > 0) {
          const tagRows = selectedTags.map((tagId: string) => ({
            material_variant_id: modalItem.id,
            tag_id: tagId,
          }))
          const { error: insertTagsError } = await supabase
            .from('material_variant_tags')
            .insert(tagRows)
          if (insertTagsError) throw insertTagsError
        }

        if (editData.supplier_id) {
          const pricingPayload = {
            supplier_id: editData.supplier_id,
            material_variant_id: modalItem.id,
            supplier_quantity: toNumber(editData.supplier_quantity),
            price: toNumber(editData.price),
            price_per_unit: toNumber(editData.price_per_unit),
          }

          if (editData.supplier_pricing_id) {
            const { error: pricingUpdateError } = await supabase
              .from('supplier_pricing')
              .update(pricingPayload)
              .eq('id', editData.supplier_pricing_id)
            if (pricingUpdateError) throw pricingUpdateError
          } else {
            const { error: pricingInsertError } = await supabase
              .from('supplier_pricing')
              .insert(pricingPayload)
            if (pricingInsertError) throw pricingInsertError
          }
        }

        queryClient.invalidateQueries({ queryKey: ['materials-with-variants'] })
        setModalOpen(false)
      } catch (error: any) {
        setModalError(error?.message || 'Update failed. Please try again.')
      }
    }

    if (modalEntity === 'suppliers') {
      updateSupplier.mutate({
        id: modalItem.id,
        updates: {
          name: editData.name,
          contact_person: editData.contact_person,
          email: editData.email,
          phone: editData.phone,
          address: editData.address,
          other_info: editData.other_info,
        },
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!modalEntity || !modalItem) return
    setModalError(null)

    try {
      if (modalEntity === 'materials') {
        await deleteMaterial.mutateAsync(modalItem.id)
      }
      if (modalEntity === 'variants') {
        await deleteVariant.mutateAsync(modalItem.id)
      }
      if (modalEntity === 'suppliers') {
        await deleteSupplier.mutateAsync(modalItem.id)
      }
    } catch (error) {
      setModalError(resolveDeleteError(error))
    }
  }

  // Count total variants across all materials
  const totalVariantsCount = useMemo(() => {
    if (!materialsData) return 0
    return materialsData.reduce((acc, m) => acc + (m.material_variants?.length || 0), 0)
  }, [materialsData])

  const tabs = [
    { id: 'materials' as TabType, label: 'Materials', icon: Package, count: materialsData?.length || 0, subCount: totalVariantsCount },
    { id: 'variants' as TabType, label: 'Material Variants', icon: Boxes, count: totalVariantsCount },
    { id: 'suppliers' as TabType, label: 'Suppliers', icon: Truck, count: suppliers?.length || 0 },
  ]

  // Format date safely
  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
              <p className="text-gray-500 mt-1">Manage materials, variants, and suppliers</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/inventory-duplicates"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Variant Duplicates
              </Link>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5" />
                Add {activeTab === 'materials' ? 'Material' : activeTab === 'variants' ? 'Variant' : 'Supplier'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); setSearch(''); setExpandedMaterials(new Set()) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-500' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
                {tab.subCount !== undefined && tab.subCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-400' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {tab.subCount} variants
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No {activeTab} found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {activeTab === 'materials' && (
                    <MaterialsTable
                      materials={paginatedData as Material[]}
                      expandedMaterials={expandedMaterials}
                      onToggleExpand={toggleMaterialExpand}
                      onEditMaterial={(material) => openEditModal('materials', material)}
                      onDeleteMaterial={(material) => openDeleteModal('materials', material)}
                      onEditVariant={(variant) => openEditModal('variants', variant)}
                      onDeleteVariant={(variant) => openDeleteModal('variants', variant)}
                      formatDate={formatDate}
                    />
                  )}

                  {activeTab === 'variants' && (
                    <VariantsTable
                      variants={paginatedData as (MaterialVariant & { material?: Material })[]}
                      onEditVariant={(variant) => openEditModal('variants', variant)}
                      onDeleteVariant={(variant) => openDeleteModal('variants', variant)}
                      formatDate={formatDate}
                    />
                  )}

                  {activeTab === 'suppliers' && (
                    <SuppliersTable
                      suppliers={paginatedData as Supplier[]}
                      onEditSupplier={(supplier) => openEditModal('suppliers', supplier)}
                      onDeleteSupplier={(supplier) => openDeleteModal('suppliers', supplier)}
                    />
                  )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, currentData.length)} of {currentData.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages || 1}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl bg-white rounded-xl shadow-2xl p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {modalMode === 'edit' ? 'Edit' : 'Delete'} {modalEntity === 'materials' ? 'Material' : modalEntity === 'variants' ? 'Variant' : 'Supplier'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              {modalMode === 'edit'
                ? 'Update the fields below and save your changes.'
                : 'Review what will be deleted before confirming.'}
            </Dialog.Description>

            {modalMode === 'edit' && modalEntity && modalItem && (
              <div className="space-y-4">
                {modalEntity === 'materials' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Name</label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Description</label>
                      <textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Unit</label>
                      <select
                        value={editData.unit_id || ''}
                        onChange={(e) => setEditData({ ...editData, unit_id: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">No unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {modalEntity === 'variants' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Variant name</label>
                      <input
                        type="text"
                        value={editData.variant_name || ''}
                        onChange={(e) => setEditData({ ...editData, variant_name: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Description</label>
                      <textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Length</label>
                        <input
                          type="number"
                          value={editData.length ?? ''}
                          onChange={(e) => setEditData({ ...editData, length: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Width</label>
                        <input
                          type="number"
                          value={editData.width ?? ''}
                          onChange={(e) => setEditData({ ...editData, width: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Thickness</label>
                        <input
                          type="number"
                          value={editData.thickness ?? ''}
                          onChange={(e) => setEditData({ ...editData, thickness: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unit</label>
                        <select
                          value={editData.unit_id || ''}
                          onChange={(e) => setEditData({ ...editData, unit_id: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">No unit</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tags</label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {tags.length === 0 && (
                          <p className="text-xs text-gray-400">No tags available</p>
                        )}
                        {tags.map((tag) => {
                          const selected = (editData.tag_ids || []).includes(tag.id)
                          return (
                            <label key={tag.id} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const current = Array.isArray(editData.tag_ids) ? editData.tag_ids : []
                                  const next = selected
                                    ? current.filter((id: string) => id !== tag.id)
                                    : [...current, tag.id]
                                  setEditData({ ...editData, tag_ids: next })
                                }}
                                className="rounded border-gray-300"
                              />
                              {tag.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Supplier pricing</label>
                      <div className="mt-2 space-y-3">
                        <div>
                          <label className="text-xs text-gray-500">Supplier</label>
                          <select
                            value={editData.supplier_id || ''}
                            onChange={(e) => setEditData({ ...editData, supplier_id: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">No supplier</option>
                            {(suppliers || []).map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Supplier Qty</label>
                            <input
                              type="number"
                              value={editData.supplier_quantity ?? ''}
                              onChange={(e) => setEditData({ ...editData, supplier_quantity: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Price</label>
                            <input
                              type="number"
                              value={editData.price ?? ''}
                              onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Price / Unit</label>
                            <input
                              type="number"
                              value={editData.price_per_unit ?? ''}
                              onChange={(e) => setEditData({ ...editData, price_per_unit: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Save to update the first supplier pricing entry for this variant.</p>
                      </div>
                    </div>
                  </>
                )}

                {modalEntity === 'suppliers' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Name</label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Contact person</label>
                        <input
                          type="text"
                          value={editData.contact_person || ''}
                          onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Phone</label>
                        <input
                          type="text"
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Address</label>
                        <input
                          type="text"
                          value={editData.address || ''}
                          onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Other info</label>
                      <textarea
                        value={editData.other_info || ''}
                        onChange={(e) => setEditData({ ...editData, other_info: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {modalMode === 'delete' && modalEntity && modalItem && (
              <div className="space-y-3">
                {deleteImpactLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading delete impact...
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {modalEntity === 'materials' && (
                      <>
                        <li>Material: <span className="font-medium">{modalItem.name}</span></li>
                        <li>Variants to remove: <span className="font-medium">{deleteImpact.variants}</span></li>
                        <li>Supplier pricing entries to remove: <span className="font-medium">{deleteImpact.supplierPricings}</span></li>
                        <li>Order references detected: <span className="font-medium">{deleteImpact.orderRefs}</span></li>
                      </>
                    )}
                    {modalEntity === 'variants' && (
                      <>
                        <li>Variant: <span className="font-medium">{modalItem.variant_name}</span></li>
                        <li>Supplier pricing entries to remove: <span className="font-medium">{deleteImpact.supplierPricings}</span></li>
                        <li>Order references detected: <span className="font-medium">{deleteImpact.orderRefs}</span></li>
                      </>
                    )}
                    {modalEntity === 'suppliers' && (
                      <>
                        <li>Supplier: <span className="font-medium">{modalItem.name}</span></li>
                        <li>Supplier pricing entries to remove: <span className="font-medium">{deleteImpact.supplierRefs}</span></li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            )}

            {modalError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              </Dialog.Close>
              {modalMode === 'edit' ? (
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  Save changes
                </button>
              ) : (
                <button
                  onClick={handleDeleteConfirm}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

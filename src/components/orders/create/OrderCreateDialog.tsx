import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import ExcelJS from 'exceljs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { ExcelDropzone } from './ExcelDropzone'
import {
  OrderCreateConfirmDialog,
  OrderCreateDetailTable,
  OrderCreateSummary,
} from './OrderCreateConfirmDialog'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

interface OrderCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ClientOption {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
}

interface PackingTypeOption {
  id: string
  code: string | null
  name: string | null
}

interface BoxTypeOption {
  id: string
  name: string | null
}

interface MaterialVariantOption {
  id: string
  variant_name: string | null
  width?: number | null
  thickness?: number | null
  unit?: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null
}

const WOOD_OUT_OF_RANGE_ID = 'c69cd6d0-d56f-441a-951c-6560d3b34d70'

interface RawPackageRow {
  rowIndex: number
  packageNumber: number
  designation: string
  quantity: number | null
  item_length: number | null
  item_width: number | null
  item_height: number | null
  internal_length: number | null
  internal_width: number | null
  internal_height: number | null
  external_length: number | null
  external_width: number | null
  external_height: number | null
  net_weight: number | null
  tare: number | null
  gross_weight: number | null
  boxTypeLabel: string | null
  packingTypeRaw: string | null
  packingTypeCode: string | null
  manufacturing: {
    big: {
      quantity: number | null
      typeLabel: string | null
      thickness: number | null
      horizontal: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
      vertical: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
    }
    small: {
      quantity: number | null
      typeLabel: string | null
      thickness: number | null
      horizontal: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
      vertical: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
    }
    lid: {
      quantity: number | null
      typeLabel: string | null
      thickness: number | null
      horizontal: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
      vertical: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
    }
    base: {
      quantity: number | null
      typeLabel: string | null
      thickness: number | null
      horizontal: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
      vertical: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
      skids: { quantity: number | null; typeLabel: string | null; width: number | null; thickness: number | null; space: number | null }
    }
  }
  securing: Array<{
    typeLabel: string | null
    quantity: number | null
    width: number | null
    thickness: number | null
  }>
  accessories: Array<{
    typeLabel: string | null
    amount: number | null
  }>
}

const INITIAL_CLIENT = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
}

const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, '')

/**
 * OrderCreateDialog
 * 
 * This component manages the "form step" only.
 * The confirm dialog is separated for clarity and reuse.
 */
export function OrderCreateDialog({ open, onOpenChange }: OrderCreateDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClient, setNewClient] = useState({ ...INITIAL_CLIENT })
  const [orderName, setOrderName] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [worksheetNames, setWorksheetNames] = useState<string[]>([])
  const [packageCount, setPackageCount] = useState(0)
  const [rawPackages, setRawPackages] = useState<RawPackageRow[]>([])
  const [packingTypeOverrides, setPackingTypeOverrides] = useState<Record<number, string>>({})
  const [packingTypeShowAll, setPackingTypeShowAll] = useState<Record<number, boolean>>({})
  const [manufacturingTypeOverrides, setManufacturingTypeOverrides] = useState<Record<string, string>>({})
  const [manufacturingShowAll, setManufacturingShowAll] = useState<Record<string, boolean>>({})
  const [isParsing, setIsParsing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await db.getClients()
      if (error) throw error
      return (data || []) as ClientOption[]
    },
    enabled: open,
    staleTime: 60000,
  })

  const { data: packingTypes = [] } = useQuery({
    queryKey: ['packingTypes'],
    queryFn: async () => {
      const { data, error } = await db.getPackingTypes()
      if (error) throw error
      return (data || []) as PackingTypeOption[]
    },
    enabled: open,
    staleTime: 60000,
  })

  const { data: boxTypes = [] } = useQuery({
    queryKey: ['boxTypes'],
    queryFn: async () => {
      const { data, error } = await db.getBoxTypes()
      if (error) throw error
      return (data || []) as BoxTypeOption[]
    },
    enabled: open,
    staleTime: 60000,
  })

  const { data: woodVariants = [] } = useQuery({
    queryKey: ['woodVariants'],
    queryFn: async () => {
      const { data, error } = await db.getMaterialVariantsByTag('Wood')
      if (error) throw error
      const variants = (data || []) as MaterialVariantOption[]
      if (!variants.some((variant) => variant.id === WOOD_OUT_OF_RANGE_ID)) {
        const { data: fallback, error: fallbackError } = await db.getMaterialVariantById(WOOD_OUT_OF_RANGE_ID)
        if (!fallbackError && fallback) {
          variants.push(fallback as MaterialVariantOption)
        }
      }
      return variants
    },
    enabled: open,
    staleTime: 60000,
  })

  const { data: bodyVariants = [] } = useQuery({
    queryKey: ['bodyVariants'],
    queryFn: async () => {
      const { data, error } = await db.getMaterialVariantsByTag('Body')
      if (error) throw error
      return (data || []) as MaterialVariantOption[]
    },
    enabled: open,
    staleTime: 60000,
  })

  const { data: materialVariants = [] } = useQuery({
    queryKey: ['materialVariants'],
    queryFn: async () => {
      const { data, error } = await db.getMaterialVariants()
      if (error) throw error
      return (data || []) as MaterialVariantOption[]
    },
    enabled: open,
    staleTime: 60000,
  })

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.createClient({
        name: newClient.name.trim(),
        contact_person: newClient.contact_person?.trim() || null,
        email: newClient.email?.trim() || null,
        phone: newClient.phone?.trim() || null,
        address: newClient.address?.trim() || null,
      })
      if (error) throw error
      return data as ClientOption
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: async (payload: { clientId: string }) => {
      const { data, error } = await db.createOrder({
        order_name: orderName.trim(),
        client_id: payload.clientId,
        created_by: user?.id || null,
      })
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!open) {
      setClientMode('existing')
      setSelectedClientId('')
      setNewClient({ ...INITIAL_CLIENT })
      setOrderName('')
      setExcelFile(null)
      setWorksheetNames([])
      setPackageCount(0)
      setRawPackages([])
      setPackingTypeOverrides({})
      setPackingTypeShowAll({})
      setManufacturingTypeOverrides({})
      setManufacturingShowAll({})
      setFileError(null)
      setValidationErrors({})
      setShowConfirm(false)
      setSubmitError(null)
    }
  }, [open])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  )

  const summary: OrderCreateSummary = useMemo(() => {
    const clientName = clientMode === 'new'
      ? newClient.name || 'New client'
      : selectedClient?.name || 'Select a client'

    return {
      orderName: orderName || 'Untitled order',
      clientName,
      fileName: excelFile?.name,
      packageCount,
      clientMode,
      newClientDetails: clientMode === 'new' ? newClient : undefined,
      worksheetNames,
    }
  }, [clientMode, newClient, orderName, selectedClient, excelFile, worksheetNames, packageCount])

  const normalizePackingTypeCode = (raw: string | null) => {
    if (!raw) return null
    const cleaned = raw
      .toUpperCase()
      .replace(/SEI/gi, '')
      .replace(/[.\s]+/g, '')
      .replace(/[^0-9A-Z]/g, '')

    const match = cleaned.match(/\d+[A-Z]/)
    return match ? match[0] : null
  }

  const normalizePackingTypeValue = (value: string | null | undefined) => {
    if (!value) return null
    return value
      .toUpperCase()
      .replace(/SEI/gi, '')
      .replace(/[.\s]+/g, '')
      .replace(/[^0-9A-Z]/g, '')
  }

  const parseNumberText = (text: string | null | undefined) => {
    if (!text) return null
    const normalized = text.replace(/,/g, '').replace(/[^0-9.-]/g, '')
    if (!normalized) return null
    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
  }

  const normalizeVariantName = (value: string | null | undefined) => {
    if (!value) return ''
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  const isGenericWood = (value: string | null | undefined) => {
    return normalizeVariantName(value).includes('WOOD')
  }

  const isWoodVariantOption = (variant: MaterialVariantOption) => {
    const normalized = normalizeVariantName(variant.variant_name)
    return normalized.includes('WOOD') || variant.id === WOOD_OUT_OF_RANGE_ID
  }

  const nearlyEqual = (a: number | null | undefined, b: number | null | undefined, epsilon = 0.001) => {
    if (a == null || b == null) return false
    return Math.abs(a - b) <= epsilon
  }

  const boxTypeMap = useMemo(() => {
    const map = new Map<string, BoxTypeOption>()
    boxTypes.forEach((box) => {
      if (box.name) {
        map.set(box.name.trim().toLowerCase(), box)
      }
    })
    return map
  }, [boxTypes])

  const materialVariantMap = useMemo(() => {
    return new Map(materialVariants.map((variant) => [variant.id, variant]))
  }, [materialVariants])

  const {
    packagePreviews,
    resolvedPackages,
    hasUnresolvedMappings,
    missingBoxTypeCount,
    missingPackingTypeCount,
    missingManufacturingCount,
    missingTemplateCount,
  } = useMemo(() => {
    const previews = rawPackages.map((pkg) => {
      const boxType = pkg.boxTypeLabel
        ? boxTypeMap.get(pkg.boxTypeLabel.trim().toLowerCase()) || null
        : null

      const rawPackingNormalized = normalizePackingTypeValue(pkg.packingTypeRaw)
      const matchedPackingOptions = rawPackingNormalized
        ? packingTypes.filter((packing) => {
          const normalized = normalizePackingTypeValue(packing.code)
          if (!normalized) return false
          if (normalized === rawPackingNormalized) return true
          if (/^\d+[A-Z]$/.test(rawPackingNormalized)) {
            return normalized.startsWith(rawPackingNormalized)
          }
          return false
        })
        : []

      const shouldShowAll = !!packingTypeShowAll[pkg.packageNumber]
      const packingOptions = shouldShowAll
        ? packingTypes
        : matchedPackingOptions.length > 0
          ? matchedPackingOptions
          : packingTypes

      const overrideId = packingTypeOverrides[pkg.packageNumber]
      const selectedPacking = overrideId
        ? packingTypes.find((option) => option.id === overrideId)
        : matchedPackingOptions.length === 1
          ? matchedPackingOptions[0]
          : null

      const packingTypeLabel = selectedPacking?.name || selectedPacking?.code || pkg.packingTypeCode || pkg.packingTypeRaw || '—'

      const buildTypePreview = (
        label: string | null,
        key: string,
        options: MaterialVariantOption[],
        extra?: { quantity?: number | null; thickness?: number | null; width?: number | null; space?: number | null }
      ) => {
        const showAll = !!manufacturingShowAll[key]
        const normalizedLabel = normalizeVariantName(label)
        const isWood = isGenericWood(label)
        const hasDims = extra?.width != null && extra?.thickness != null
        const scopedOptions = isWood ? options.filter(isWoodVariantOption) : options
        const matchedByNameExact = scopedOptions.filter(
          (variant) => normalizeVariantName(variant.variant_name) === normalizedLabel
        )
        const matchedByNameFuzzy = matchedByNameExact.length === 0
          ? scopedOptions.filter((variant) => {
              const normalizedVariant = normalizeVariantName(variant.variant_name)
              return normalizedVariant.includes(normalizedLabel) || normalizedLabel.includes(normalizedVariant)
            })
          : []
        
        if (key.includes('accessory') && label && matchedByNameExact.length === 0 && matchedByNameFuzzy.length === 0) {
           console.log(`[Match Fail] Label: "${label}" Normalized: "${normalizedLabel}"`)
           console.log(`[Match Fail] Options Available: ${options.length}, Scoped: ${scopedOptions.length}`)
           // Log the first 5 normalized options to see what we are comparing against
           if (options.length > 0) {
              console.log('[Match Fail] Sample DB Variants (Normalized):', options.slice(0, 5).map(v => normalizeVariantName(v.variant_name)))
           }
           const manualMatch = scopedOptions.find(v => (v.variant_name || '').toUpperCase() === (label || '').toUpperCase())
           if (manualMatch) {
             console.log(`[Match Fail] FOUND EXACT CASE-INSENSITIVE MATCH: "${manualMatch.variant_name}"`)
             console.log(`[Match Fail] DB Normalized: "${normalizeVariantName(manualMatch.variant_name)}"`)
           }
        }

        const matchedByName = matchedByNameExact.length > 0 ? matchedByNameExact : matchedByNameFuzzy
        const matchedByDims = isWood && hasDims
          ? scopedOptions.filter((variant) =>
              nearlyEqual(variant.width ?? null, extra?.width ?? null) &&
              nearlyEqual(variant.thickness ?? null, extra?.thickness ?? null)
            )
          : []
        const matchedByDimsSwap = isWood && hasDims
          ? scopedOptions.filter((variant) =>
              nearlyEqual(variant.width ?? null, extra?.thickness ?? null) &&
              nearlyEqual(variant.thickness ?? null, extra?.width ?? null)
            )
          : []
        const matched = isWood
          ? (matchedByDims.length > 0 ? matchedByDims : matchedByDimsSwap)
          : matchedByName

        const baseOptions = showAll
          ? scopedOptions
          : matched.length > 0
            ? matched
            : scopedOptions

        const overrideId = manufacturingTypeOverrides[key]
        const selected = overrideId
          ? scopedOptions.find((variant) => variant.id === overrideId)
          : isWood
            ? matched[0] || scopedOptions.find((variant) => variant.id === WOOD_OUT_OF_RANGE_ID) || null
            : matched.length === 1
              ? matched[0]
              : null

        return {
          key,
          typeLabel: label,
          typeId: selected?.id || null,
          typeResolved: !!selected,
          typeOptions: baseOptions.map((variant) => ({
            id: variant.id,
            label: variant.variant_name || 'Unnamed',
          })),
          hasMatchedOptions: matched.length > 0,
          showAllOptions: showAll,
          quantity: extra?.quantity ?? null,
          thickness: extra?.thickness ?? null,
          width: extra?.width ?? null,
          space: extra?.space ?? null,
        }
      }

      const securingPreviews = pkg.securing.map((part, index) =>
        buildTypePreview(part.typeLabel, `pkg:${pkg.packageNumber}:securing:${index}`, woodVariants, {
          quantity: part.quantity,
          width: part.width,
          thickness: part.thickness,
        })
      )

      const accessoryPreviews = pkg.accessories.map((part: RawPackageRow['accessories'][number], index: number) =>
        buildTypePreview(part.typeLabel, `pkg:${pkg.packageNumber}:accessory:${index}`, materialVariants, {
          quantity: part.amount,
        })
      )

      return {
        packageNumber: pkg.packageNumber,
        rowIndex: pkg.rowIndex,
        designation: pkg.designation,
        quantity: pkg.quantity,
        boxTypeLabel: pkg.boxTypeLabel,
        boxTypeResolved: !!boxType,
        boxTypeId: boxType?.id || null,
        packingTypeRaw: pkg.packingTypeRaw,
        packingTypeCode: pkg.packingTypeCode,
        packingTypeLabel,
        packingTypeResolved: !!selectedPacking,
        packingTypeId: selectedPacking?.id || null,
        packingTypeOptions: packingOptions.map((option) => ({
          id: option.id,
          label: `${option.code || '—'}${option.name ? ` - ${option.name}` : ''}`,
        })),
        hasMatchedPackingOptions: matchedPackingOptions.length > 0,
        showAllPackingOptions: shouldShowAll,
        internal: {
          length: pkg.internal_length,
          width: pkg.internal_width,
          height: pkg.internal_height,
        },
        item: {
          length: pkg.item_length,
          width: pkg.item_width,
          height: pkg.item_height,
        },
        external: {
          length: pkg.external_length,
          width: pkg.external_width,
          height: pkg.external_height,
        },
        netWeight: pkg.net_weight,
        tare: pkg.tare,
        grossWeight: pkg.gross_weight,
        manufacturing: {
          big: {
            template: buildTypePreview(pkg.manufacturing.big.typeLabel, `pkg:${pkg.packageNumber}:big:template`, bodyVariants, {
              quantity: pkg.manufacturing.big.quantity,
              thickness: pkg.manufacturing.big.thickness,
            }),
            horizontal: buildTypePreview(pkg.manufacturing.big.horizontal.typeLabel, `pkg:${pkg.packageNumber}:big:horizontal`, woodVariants, {
              quantity: pkg.manufacturing.big.horizontal.quantity,
              width: pkg.manufacturing.big.horizontal.width,
              thickness: pkg.manufacturing.big.horizontal.thickness,
              space: pkg.manufacturing.big.horizontal.space,
            }),
            vertical: buildTypePreview(pkg.manufacturing.big.vertical.typeLabel, `pkg:${pkg.packageNumber}:big:vertical`, woodVariants, {
              quantity: pkg.manufacturing.big.vertical.quantity,
              width: pkg.manufacturing.big.vertical.width,
              thickness: pkg.manufacturing.big.vertical.thickness,
              space: pkg.manufacturing.big.vertical.space,
            }),
          },
          small: {
            template: buildTypePreview(pkg.manufacturing.small.typeLabel, `pkg:${pkg.packageNumber}:small:template`, bodyVariants, {
              quantity: pkg.manufacturing.small.quantity,
              thickness: pkg.manufacturing.small.thickness,
            }),
            horizontal: buildTypePreview(pkg.manufacturing.small.horizontal.typeLabel, `pkg:${pkg.packageNumber}:small:horizontal`, woodVariants, {
              quantity: pkg.manufacturing.small.horizontal.quantity,
              width: pkg.manufacturing.small.horizontal.width,
              thickness: pkg.manufacturing.small.horizontal.thickness,
              space: pkg.manufacturing.small.horizontal.space,
            }),
            vertical: buildTypePreview(pkg.manufacturing.small.vertical.typeLabel, `pkg:${pkg.packageNumber}:small:vertical`, woodVariants, {
              quantity: pkg.manufacturing.small.vertical.quantity,
              width: pkg.manufacturing.small.vertical.width,
              thickness: pkg.manufacturing.small.vertical.thickness,
              space: pkg.manufacturing.small.vertical.space,
            }),
          },
          lid: {
            template: buildTypePreview(pkg.manufacturing.lid.typeLabel, `pkg:${pkg.packageNumber}:lid:template`, bodyVariants, {
              quantity: pkg.manufacturing.lid.quantity,
              thickness: pkg.manufacturing.lid.thickness,
            }),
            horizontal: buildTypePreview(pkg.manufacturing.lid.horizontal.typeLabel, `pkg:${pkg.packageNumber}:lid:horizontal`, woodVariants, {
              quantity: pkg.manufacturing.lid.horizontal.quantity,
              width: pkg.manufacturing.lid.horizontal.width,
              thickness: pkg.manufacturing.lid.horizontal.thickness,
              space: pkg.manufacturing.lid.horizontal.space,
            }),
            vertical: buildTypePreview(pkg.manufacturing.lid.vertical.typeLabel, `pkg:${pkg.packageNumber}:lid:vertical`, woodVariants, {
              quantity: pkg.manufacturing.lid.vertical.quantity,
              width: pkg.manufacturing.lid.vertical.width,
              thickness: pkg.manufacturing.lid.vertical.thickness,
              space: pkg.manufacturing.lid.vertical.space,
            }),
          },
          base: {
            template: buildTypePreview(pkg.manufacturing.base.typeLabel, `pkg:${pkg.packageNumber}:base:template`, bodyVariants, {
              quantity: pkg.manufacturing.base.quantity,
              thickness: pkg.manufacturing.base.thickness,
            }),
            horizontal: buildTypePreview(pkg.manufacturing.base.horizontal.typeLabel, `pkg:${pkg.packageNumber}:base:horizontal`, woodVariants, {
              quantity: pkg.manufacturing.base.horizontal.quantity,
              width: pkg.manufacturing.base.horizontal.width,
              thickness: pkg.manufacturing.base.horizontal.thickness,
              space: pkg.manufacturing.base.horizontal.space,
            }),
            vertical: buildTypePreview(pkg.manufacturing.base.vertical.typeLabel, `pkg:${pkg.packageNumber}:base:vertical`, woodVariants, {
              quantity: pkg.manufacturing.base.vertical.quantity,
              width: pkg.manufacturing.base.vertical.width,
              thickness: pkg.manufacturing.base.vertical.thickness,
              space: pkg.manufacturing.base.vertical.space,
            }),
            skids: buildTypePreview(pkg.manufacturing.base.skids.typeLabel, `pkg:${pkg.packageNumber}:base:skids`, woodVariants, {
              quantity: pkg.manufacturing.base.skids.quantity,
              width: pkg.manufacturing.base.skids.width,
              thickness: pkg.manufacturing.base.skids.thickness,
              space: pkg.manufacturing.base.skids.space,
            }),
          },
        },
        securing: securingPreviews,
        accessories: accessoryPreviews,
      }
    })

    const resolved = previews.map((preview) => ({
      packageNumber: preview.packageNumber,
      designation: preview.designation,
      quantity: preview.quantity,
      item_length: preview.item.length,
      item_width: preview.item.width,
      item_height: preview.item.height,
      box_type_id: preview.boxTypeId,
      packing_type_id: preview.packingTypeId,
      internal_length: preview.internal.length,
      internal_width: preview.internal.width,
      internal_height: preview.internal.height,
      external_length: preview.external.length,
      external_width: preview.external.width,
      external_height: preview.external.height,
      net_weight: preview.netWeight,
      tare: preview.tare,
      gross_weight: preview.grossWeight,
      manufacturing: preview.manufacturing,
      securing: (preview as any).securing?.map((part: any) => ({
        typeId: part.typeId,
        quantity: part.quantity,
        width: part.width,
        thickness: part.thickness,
        typeLabel: part.typeLabel,
      })) || [],
      accessories: (preview as any).accessories?.map((part: any) => ({
        typeId: part.typeId,
        amount: part.quantity,
        typeLabel: part.typeLabel,
      })) || [],
    }))

    const missingBoxTypeCount = previews.filter((preview) => !preview.boxTypeResolved).length
    const missingPackingTypeCount = previews.filter((preview) => !preview.packingTypeResolved).length
    const templateParts = previews.flatMap((preview) => [
      preview.manufacturing.big.template,
      preview.manufacturing.small.template,
      preview.manufacturing.lid.template,
      preview.manufacturing.base.template,
    ])
    const barParts = previews.flatMap((preview) => [
      preview.manufacturing.big.horizontal,
      preview.manufacturing.big.vertical,
      preview.manufacturing.small.horizontal,
      preview.manufacturing.small.vertical,
      preview.manufacturing.lid.horizontal,
      preview.manufacturing.lid.vertical,
      preview.manufacturing.base.horizontal,
      preview.manufacturing.base.vertical,
      preview.manufacturing.base.skids,
    ])
    const missingTemplateCount = templateParts.filter((part) => part.typeLabel && !part.typeResolved).length
    const missingManufacturingCount = barParts.filter((part) => part.typeLabel && !part.typeResolved).length
    const unresolved = previews.some((preview) => !preview.boxTypeResolved || !preview.packingTypeResolved) || missingManufacturingCount > 0

    return {
      packagePreviews: previews,
      resolvedPackages: resolved,
      hasUnresolvedMappings: unresolved,
      missingBoxTypeCount,
      missingPackingTypeCount,
      missingManufacturingCount,
      missingTemplateCount,
    }
  }, [
    rawPackages,
    boxTypeMap,
    packingTypes,
    packingTypeOverrides,
    packingTypeShowAll,
    woodVariants,
    bodyVariants,
    manufacturingTypeOverrides,
    manufacturingShowAll,
    materialVariants,
  ])

  const detailTables: OrderCreateDetailTable[] = useMemo(() => {
    const tables: OrderCreateDetailTable[] = [
      {
        tableName: 'orders',
        description: 'Primary order record (created immediately).',
        columns: [
          { column: 'id', value: 'Auto-generated', note: 'UUID' },
          { column: 'order_name', value: orderName || 'From Excel filename' },
          { column: 'client_id', value: summary.clientName },
          { column: 'production_status', value: 'pending', note: 'Default' },
          { column: 'commercial_status', value: 'draft', note: 'Default' },
          { column: 'created_at', value: 'Auto-generated', note: 'Timestamp' },
          { column: 'updated_at', value: 'Auto-generated', note: 'Timestamp' },
        ],
      },
    ]

    if (clientMode === 'new') {
      tables.unshift({
        tableName: 'clients',
        description: 'New client record (created first).',
        columns: [
          { column: 'id', value: 'Auto-generated', note: 'UUID' },
          { column: 'name', value: newClient.name || 'Required' },
          { column: 'contact_person', value: newClient.contact_person || '—' },
          { column: 'email', value: newClient.email || '—' },
          { column: 'phone', value: newClient.phone || '—' },
          { column: 'address', value: newClient.address || '—' },
          { column: 'created_at', value: 'Auto-generated', note: 'Timestamp' },
          { column: 'updated_at', value: 'Auto-generated', note: 'Timestamp' },
        ],
      })
    }

    tables.push({
      tableName: 'order_packages',
      description: 'Packages created from the Calculation sheet (row 4 onward).',
      columns: [
        { column: 'package_number', value: `1 → ${Math.max(packageCount, 1)}`, note: `${packageCount} package(s)` },
        { column: 'status', value: 'design', note: 'Default' },
        { column: 'order_id', value: 'New order id', note: 'FK to orders' },
      ],
    })

    return tables
  }, [clientMode, newClient, orderName, summary.clientName, packageCount])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!orderName.trim()) {
      errors.orderName = 'Order name is required'
    }

    if (clientMode === 'existing' && !selectedClientId) {
      errors.client = 'Select an existing client'
    }

    if (clientMode === 'new' && !newClient.name.trim()) {
      errors.client = 'Client name is required'
    }

    if (!excelFile) {
      errors.file = 'Excel file is required'
    }

    if (excelFile && packageCount === 0) {
      errors.file = 'No package rows detected. Check column B starting at row 4.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const parsePackageRows = (sheet: ExcelJS.Worksheet) => {
    const rows: RawPackageRow[] = []
    let packageNumber = 1
    const getText = (address: string) => sheet.getCell(address).text?.trim() || ''
    const columnToNumber = (label: string) => {
      let result = 0
      for (let i = 0; i < label.length; i += 1) {
        result = result * 26 + (label.charCodeAt(i) - 64)
      }
      return result
    }

    for (let row = 4; row < 1000; row += 1) {
      const currentLabel = getText(`B${row}`)
      if (!currentLabel) break

      const nextLabel = getText(`B${row + 1}`)

      const quantity = parseNumberText(getText(`A${row}`))
      const itemLength = parseNumberText(getText(`M${row}`))
      const itemWidth = parseNumberText(getText(`N${row}`))
      const itemHeight = parseNumberText(getText(`O${row}`))
      const internalLength = parseNumberText(getText(`V${row}`))
      const internalWidth = parseNumberText(getText(`W${row}`))
      const internalHeight = parseNumberText(getText(`X${row}`))
      const externalLength = parseNumberText(getText(`Y${row}`))
      const externalWidth = parseNumberText(getText(`Z${row}`))
      const externalHeight = parseNumberText(getText(`AA${row}`))
      const netWeight = parseNumberText(getText(`U${row}`))
      const tare = parseNumberText(getText(`BAB${row}`))
      const grossWeight = (netWeight !== null && tare !== null) ? netWeight + tare : null
      const boxTypeLabel = getText(`C${row}`) || null
      const packingTypeRaw = getText(`AB${row}`) || null
      const packingTypeCode = normalizePackingTypeCode(packingTypeRaw)

      const bigTypeLabel = getText(`BK${row}`) || null
      const bigQuantity = parseNumberText(getText(`BM${row}`))
      const bigThickness = parseNumberText(getText(`BP${row}`))
      const bigHorizQty = parseNumberText(getText(`DS${row}`))
      const bigHorizType = getText(`DQ${row}`) || null
      const bigHorizWidth = parseNumberText(getText(`DV${row}`))
      const bigHorizThickness = parseNumberText(getText(`DW${row}`))
      const bigHorizSpace = parseNumberText(getText(`DT${row}`))
      const bigVertQty = parseNumberText(getText(`EC${row}`))
      const bigVertWidth = parseNumberText(getText(`EF${row}`))
      const bigVertThickness = parseNumberText(getText(`EG${row}`))
      const bigVertSpace = parseNumberText(getText(`ED${row}`))

      const smallTypeLabel = getText(`GB${row}`) || null
      const smallQuantity = parseNumberText(getText(`GC${row}`))
      const smallThickness = parseNumberText(getText(`GF${row}`))
      const smallHorizQty = parseNumberText(getText(`IJ${row}`))
      const smallHorizType = getText(`IH${row}`) || null
      const smallHorizWidth = parseNumberText(getText(`IM${row}`))
      const smallHorizThickness = parseNumberText(getText(`IN${row}`))
      const smallHorizSpace = parseNumberText(getText(`IK${row}`))
      const smallVertQty = parseNumberText(getText(`IT${row}`))
      const smallVertWidth = parseNumberText(getText(`IW${row}`))
      const smallVertThickness = parseNumberText(getText(`IX${row}`))
      const smallVertSpace = parseNumberText(getText(`IU${row}`))

      const lidTypeLabel = getText(`KS${row}`) || null
      const lidQuantity = parseNumberText(getText(`KT${row}`))
      const lidThickness = parseNumberText(getText(`KW${row}`))
      const lidHorizQty = parseNumberText(getText(`NA${row}`))
      const lidHorizType = getText(`MY${row}`) || null
      const lidHorizWidth = parseNumberText(getText(`ND${row}`))
      const lidHorizThickness = parseNumberText(getText(`NE${row}`))
      const lidHorizSpace = parseNumberText(getText(`NB${row}`))
      const lidVertQty = parseNumberText(getText(`NK${row}`))
      const lidVertWidth = parseNumberText(getText(`NN${row}`))
      const lidVertThickness = parseNumberText(getText(`NO${row}`))
      const lidVertSpace = parseNumberText(getText(`NL${row}`))

      const baseTypeLabel = getText(`PL${row}`) || null
      const baseQuantity = parseNumberText(getText(`PM${row}`))
      const baseThickness = parseNumberText(getText(`PP${row}`))
      const baseHorizQty = parseNumberText(getText(`RU${row}`))
      const baseHorizType = getText(`RS${row}`) || null
      const baseHorizWidth = parseNumberText(getText(`RX${row}`))
      const baseHorizThickness = parseNumberText(getText(`RY${row}`))
      const baseHorizSpace = parseNumberText(getText(`RV${row}`))
      const baseVertQty = parseNumberText(getText(`SB${row}`))
      const baseVertWidth = parseNumberText(getText(`SE${row}`))
      const baseVertThickness = parseNumberText(getText(`SF${row}`))
      const baseVertSpace = parseNumberText(getText(`SC${row}`))
      const baseSkidQty = parseNumberText(getText(`TY${row}`))
      const baseSkidType = getText(`TW${row}`) || null
      const baseSkidWidth = parseNumberText(getText(`UB${row}`))
      const baseSkidThickness = parseNumberText(getText(`UC${row}`))
      const baseSkidSpace = parseNumberText(getText(`TZ${row}`))

      const accessories: RawPackageRow['accessories'] = []
      const accessoryStart = columnToNumber('BAD')
      const accessoryEnd = columnToNumber('BDA')
      const getAccessoryHeader = (col: number) => {
        const headerRow2 = sheet.getCell(2, col).text?.trim() || ''
        const headerRow3 = sheet.getCell(3, col).text?.trim() || ''
        return headerRow3 || headerRow2
      }
      for (let col = accessoryStart; col <= accessoryEnd; col += 1) {
        const typeLabel = getAccessoryHeader(col)
        const amount = parseNumberText(sheet.getCell(row, col).text?.trim() || '')
        if (typeLabel && amount !== null) {
          accessories.push({
            typeLabel: typeLabel || null,
            amount,
          })
        }
      }


      const securing: RawPackageRow['securing'] = [
        {
          typeLabel: getText(`WT${row}`) || null,
          quantity: parseNumberText(getText(`WV${row}`)),
          width: parseNumberText(getText(`WX${row}`)),
          thickness: parseNumberText(getText(`WY${row}`)),
        },
        {
          typeLabel: getText(`AAM${row}`) || null,
          quantity: parseNumberText(getText(`AAO${row}`)),
          width: parseNumberText(getText(`AAQ${row}`)),
          thickness: parseNumberText(getText(`AAR${row}`)),
        },
        {
          typeLabel: getText(`AEF${row}`) || null,
          quantity: parseNumberText(getText(`AEH${row}`)),
          width: parseNumberText(getText(`AEJ${row}`)),
          thickness: parseNumberText(getText(`AEK${row}`)),
        },
        {
          typeLabel: getText(`AHY${row}`) || null,
          quantity: parseNumberText(getText(`AIA${row}`)),
          width: parseNumberText(getText(`AIC${row}`)),
          thickness: parseNumberText(getText(`AID${row}`)),
        },
        {
          typeLabel: getText(`ALR${row}`) || null,
          quantity: parseNumberText(getText(`ALT${row}`)),
          width: parseNumberText(getText(`ALV${row}`)),
          thickness: parseNumberText(getText(`ALW${row}`)),
        },
        {
          typeLabel: getText(`APK${row}`) || null,
          quantity: parseNumberText(getText(`APM${row}`)),
          width: parseNumberText(getText(`APO${row}`)),
          thickness: parseNumberText(getText(`APP${row}`)),
        },
        {
          typeLabel: getText(`ATD${row}`) || null,
          quantity: parseNumberText(getText(`ATF${row}`)),
          width: parseNumberText(getText(`ATH${row}`)),
          thickness: parseNumberText(getText(`ATI${row}`)),
        },
      ]

      rows.push({
        rowIndex: row,
        packageNumber,
        designation: currentLabel,
        quantity,
        item_length: itemLength,
        item_width: itemWidth,
        item_height: itemHeight,
        internal_length: internalLength,
        internal_width: internalWidth,
        internal_height: internalHeight,
        external_length: externalLength,
        external_width: externalWidth,
        external_height: externalHeight,
        net_weight: netWeight,
        tare,
        gross_weight: grossWeight,
        boxTypeLabel,
        packingTypeRaw,
        packingTypeCode,
        manufacturing: {
          big: {
            quantity: bigQuantity,
            typeLabel: bigTypeLabel,
            thickness: bigThickness !== null ? bigThickness * 10 : null,
            horizontal: {
              quantity: bigHorizQty,
              typeLabel: bigHorizType,
              width: bigHorizWidth,
              thickness: bigHorizThickness,
              space: bigHorizSpace,
            },
            vertical: {
              quantity: bigVertQty,
              typeLabel: bigHorizType,
              width: bigVertWidth,
              thickness: bigVertThickness,
              space: bigVertSpace,
            },
          },
          small: {
            quantity: smallQuantity,
            typeLabel: smallTypeLabel,
            thickness: smallThickness !== null ? smallThickness * 10 : null,
            horizontal: {
              quantity: smallHorizQty,
              typeLabel: smallHorizType,
              width: smallHorizWidth,
              thickness: smallHorizThickness,
              space: smallHorizSpace,
            },
            vertical: {
              quantity: smallVertQty,
              typeLabel: smallHorizType,
              width: smallVertWidth,
              thickness: smallVertThickness,
              space: smallVertSpace,
            },
          },
          lid: {
            quantity: lidQuantity,
            typeLabel: lidTypeLabel,
            thickness: lidThickness !== null ? lidThickness * 10 : null,
            horizontal: {
              quantity: lidHorizQty,
              typeLabel: lidHorizType,
              width: lidHorizWidth,
              thickness: lidHorizThickness,
              space: lidHorizSpace,
            },
            vertical: {
              quantity: lidVertQty,
              typeLabel: lidHorizType,
              width: lidVertWidth,
              thickness: lidVertThickness,
              space: lidVertSpace,
            },
          },
          base: {
            quantity: baseQuantity,
            typeLabel: baseTypeLabel,
            thickness: baseThickness !== null ? baseThickness * 10 : null,
            horizontal: {
              quantity: baseHorizQty,
              typeLabel: baseHorizType,
              width: baseHorizWidth,
              thickness: baseHorizThickness,
              space: baseHorizSpace,
            },
            vertical: {
              quantity: baseVertQty,
              typeLabel: baseHorizType,
              width: baseVertWidth,
              thickness: baseVertThickness,
              space: baseVertSpace,
            },
            skids: {
              quantity: baseSkidQty,
              typeLabel: baseSkidType,
              width: baseSkidWidth,
              thickness: baseSkidThickness,
              space: baseSkidSpace,
            },
          },
        },
        securing,
        accessories,
      })

      if (!nextLabel) break
      packageNumber += 1
    }

    return rows
  }

  const parseExcelFile = async (file: File) => {
    setIsParsing(true)
    setFileError(null)

    try {
      const workbook = new ExcelJS.Workbook()
      const buffer = await file.arrayBuffer()
      await workbook.xlsx.load(buffer)

      // For now we only capture the "Calculation" sheet (fallback to the first sheet).
      const calculationSheet = workbook.worksheets.find((sheet) => sheet.name === 'Calculation')
      const targetSheet = calculationSheet ?? workbook.worksheets[0]

      if (!targetSheet) {
        setFileError('No worksheets were found in this Excel file.')
        setWorksheetNames([])
        setPackageCount(0)
        setRawPackages([])
        return
      }

      if (!calculationSheet) {
        setFileError('"Calculation" sheet not found. Using the first worksheet instead.')
      }

      setWorksheetNames([targetSheet.name])
      const parsedRows = parsePackageRows(targetSheet)
      setRawPackages(parsedRows)
      setPackageCount(parsedRows.length)
    } catch (error) {
      console.error('Failed to parse Excel file:', error)
      setFileError('Unable to read this Excel file. Please check the format.')
      setWorksheetNames([])
      setPackageCount(0)
      setRawPackages([])
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileSelected = async (file: File) => {
    setExcelFile(file)
    setOrderName(stripExtension(file.name))
    setValidationErrors((prev) => ({ ...prev, file: '' }))
    await parseExcelFile(file)
  }

  const handleReview = () => {
    setSubmitError(null)
    if (!validateForm()) return
    setShowConfirm(true)
  }

  const handleConfirmCreate = async () => {
    setSubmitError(null)

    try {
      let clientId = selectedClientId

      if (clientMode === 'new') {
        const client = await createClientMutation.mutateAsync()
        clientId = client.id
      }

      const order = await createOrderMutation.mutateAsync({ clientId })

      const { data: createdPackages, error: packagesError } = await db.createOrderPackages({
        order_id: order.id,
        package_numbers: resolvedPackages.map((pkg) => pkg.packageNumber),
        status: 'design',
      })

      if (packagesError) throw packagesError

      const packageByNumber = new Map<number, { id: string; package_number: number }>()
      ;(createdPackages || []).forEach((pkg: any) => {
        packageByNumber.set(pkg.package_number, { id: pkg.id, package_number: pkg.package_number })
      })

      for (const pkg of resolvedPackages) {
        const orderPackage = packageByNumber.get(pkg.packageNumber)
        if (!orderPackage) continue

        const { data: originalInfo, error: originalError } = await db.createPackageInfo({
          internal_length: pkg.internal_length,
          internal_width: pkg.internal_width,
          internal_height: pkg.internal_height,
          external_length: pkg.external_length,
          external_width: pkg.external_width,
          external_height: pkg.external_height,
          quantity: pkg.quantity,
          packing_type_id: pkg.packing_type_id,
          box_type_id: pkg.box_type_id,
          tare: pkg.tare,
          net_weight: pkg.net_weight,
          gross_weight: pkg.gross_weight,
        })

        if (originalError) throw originalError

        const { data: finalInfo, error: finalError } = await db.createPackageInfo({})
        if (finalError) throw finalError

        const { error: updateError } = await db.updateOrderPackageInfo({
          order_package_id: orderPackage.id,
          original_pkg_info: originalInfo?.id || null,
          final_pkg_info: finalInfo?.id || null,
        })

        if (updateError) throw updateError

        const designation = pkg.designation?.trim()
        if (designation) {
          const { error: itemsError } = await db.createPackageItems([
            {
              order_package_id: orderPackage.id,
              quantity: 1,
              designation,
              length: pkg.item_length,
              width: pkg.item_width,
              height: pkg.item_height,
            },
          ])

          if (itemsError) throw itemsError
        }

        const createBeamIfNeeded = async (part: any) => {
          const hasData = part.typeLabel || part.quantity !== null || part.width !== null || part.thickness !== null || part.space !== null
          if (!hasData) return null
          if (!part.typeId) throw new Error('Missing manufacturing material selection')

          const { data, error } = await db.createBeam({
            quantity: part.quantity,
            type: part.typeId,
            width: part.width,
            thickness: part.thickness,
            space: part.space,
          })

          if (error) throw error
          return data?.id || null
        }

        const createSide = async (sideKey: 'big_sides' | 'small_sides' | 'lid' | 'base', side: any, includeSkids: boolean) => {
          const horizontalId = await createBeamIfNeeded(side.horizontal)
          const verticalId = await createBeamIfNeeded(side.vertical)
          const skidsId = includeSkids ? await createBeamIfNeeded(side.skids) : null

          const { data: template, error: templateError } = await db.createSecuringTemplate({
            quantity: side.template.quantity,
            type_id: side.template.typeId,
            thickness: side.template.thickness,
            horizontal_bar: horizontalId,
            vertical_bar: verticalId,
            skids: skidsId,
          })

          if (templateError) throw templateError

          const { error: securingError } = await db.createOrderPackageSecuring({
            order_package_id: orderPackage.id,
            securing_template_id: template?.id || null,
            securing_side: sideKey,
            is_final: false,
          })

          if (securingError) throw securingError

          const { data: finalTemplate, error: finalTemplateError } = await db.createSecuringTemplate({})
          if (finalTemplateError) throw finalTemplateError

          const { error: finalSecuringError } = await db.createOrderPackageSecuring({
            order_package_id: orderPackage.id,
            securing_template_id: finalTemplate?.id || null,
            securing_side: sideKey,
            is_final: true,
          })

          if (finalSecuringError) throw finalSecuringError
        }

        await createSide('big_sides', pkg.manufacturing.big, false)
        await createSide('small_sides', pkg.manufacturing.small, false)
        await createSide('lid', pkg.manufacturing.lid, false)
        await createSide('base', pkg.manufacturing.base, true)

        const securingMaterials = (pkg as any).securing || []
        const securingPayload = securingMaterials
          .filter((part: any) => {
            const hasData = part.typeLabel || part.quantity !== null || part.width !== null || part.thickness !== null
            return hasData && !!part.typeId
          })
          .map((part: any) => ({
            order_package_id: orderPackage.id,
            material_variant_id: part.typeId as string,
            material_type: 'Securing',
            is_final: false,
            quantity: part.quantity ?? null,
            unit_id: null,
            length: null,
            width: part.width ?? null,
            height: part.thickness ?? null,
            comment: null,
          }))

        if (securingPayload.length > 0) {
          const { error: securingError } = await db.createOrderPackageMaterials(securingPayload)
          if (securingError) throw securingError
        }

        const accessories = (pkg as any).accessories || []
        const accessoryPayload = accessories
          .filter((part: any) => {
            const hasData = part.typeLabel || part.amount !== null
            return hasData && !!part.typeId
          })
          .map((part: any) => {
            const variant = materialVariantMap.get(part.typeId as string)
            const unitValue = Array.isArray(variant?.unit) ? variant?.unit[0] : variant?.unit
            const quantity = part.amount ?? null
            return {
              order_package_id: orderPackage.id,
              material_variant_id: part.typeId as string,
              material_type: 'Accessories',
              is_final: false,
              quantity,
              unit_id: unitValue?.id || null,
              length: null,
              width: null,
              height: null,
              comment: null,
            }
          })

        if (accessoryPayload.length > 0) {
          const { error: accessoryError } = await db.createOrderPackageMaterials(accessoryPayload)
          if (accessoryError) throw accessoryError
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })

      setShowConfirm(false)
      onOpenChange(false)
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to create order')
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-1">Create order from Excel</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-6">
              Upload a spreadsheet, confirm the details, and generate the base order.
            </Dialog.Description>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Client</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setClientMode('existing')}
                    className={`px-3 py-1.5 text-xs rounded-full border ${
                      clientMode === 'existing'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Existing client
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode('new')}
                    className={`px-3 py-1.5 text-xs rounded-full border ${
                      clientMode === 'new'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Create new client
                  </button>
                </div>

                {clientMode === 'existing' ? (
                  <div>
                    <select
                      value={selectedClientId}
                      onChange={(event) => {
                        setSelectedClientId(event.target.value)
                        setValidationErrors((prev) => ({ ...prev, client: '' }))
                      }}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a client...</option>
                      {clientsLoading ? (
                        <option disabled>Loading clients...</option>
                      ) : (
                        clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(event) => {
                        setNewClient((prev) => ({ ...prev, name: event.target.value }))
                        setValidationErrors((prev) => ({ ...prev, client: '' }))
                      }}
                      placeholder="Client name *"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newClient.contact_person}
                      onChange={(event) => setNewClient((prev) => ({ ...prev, contact_person: event.target.value }))}
                      placeholder="Contact person"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(event) => setNewClient((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Email"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(event) => setNewClient((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Phone"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newClient.address}
                      onChange={(event) => setNewClient((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="Address"
                      className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {validationErrors.client && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.client}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Order name</label>
                <input
                  type="text"
                  value={orderName}
                  onChange={(event) => {
                    setOrderName(event.target.value)
                    setValidationErrors((prev) => ({ ...prev, orderName: '' }))
                  }}
                  placeholder="Order name (defaults to Excel filename)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.orderName && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.orderName}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">Excel upload</p>
                  {isParsing ? (
                    <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing...
                    </span>
                  ) : worksheetNames.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {worksheetNames.length} sheet(s) detected
                    </span>
                  )}
                </div>
                <ExcelDropzone
                  file={excelFile}
                  onFileSelected={handleFileSelected}
                  onClear={() => {
                    setExcelFile(null)
                    setWorksheetNames([])
                    setPackageCount(0)
                    setRawPackages([])
                    setPackingTypeOverrides({})
                    setPackingTypeShowAll({})
                    setFileError(null)
                  }}
                  onInvalidFile={(file) => {
                    setFileError(`Unsupported file type: ${file.name}. Please upload .xlsx, .xls, or .xlsm.`)
                  }}
                  error={fileError || validationErrors.file}
                  helperText="We parse the Calculation sheet and detect package rows."
                />
                {packageCount > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    Detected {packageCount} package row(s) in column B starting at row 4.
                  </p>
                )}
                {hasUnresolvedMappings && (
                  <p className="mt-1 text-xs text-amber-600">
                    Some rows need box type, packing type, or manufacturing material selections. Review in the confirmation step.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <p>
                    We create the order and its package rows now. Package info will be added next.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleReview}
                disabled={isParsing}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                  isParsing
                    ? 'bg-blue-300'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {(isParsing || createClientMutation.isPending || createOrderMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Review & confirm
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <OrderCreateConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        summary={summary}
        detailTables={detailTables}
        packagePreviews={packagePreviews}
        onPackingTypeChange={(packageNumber, packingTypeId) => {
          setPackingTypeOverrides((prev) => ({
            ...prev,
            [packageNumber]: packingTypeId,
          }))
        }}
        onPackingTypeOptionsToggle={(packageNumber) => {
          setPackingTypeShowAll((prev) => ({
            ...prev,
            [packageNumber]: !prev[packageNumber],
          }))
        }}
        onManufacturingTypeChange={(key, typeId) => {
          setManufacturingTypeOverrides((prev) => ({
            ...prev,
            [key]: typeId,
          }))
        }}
        onManufacturingOptionsToggle={(key) => {
          setManufacturingShowAll((prev) => ({
            ...prev,
            [key]: !prev[key],
          }))
        }}
        confirmDisabled={hasUnresolvedMappings}
        confirmDisabledReason={hasUnresolvedMappings
          ? `Resolve missing ${missingBoxTypeCount > 0 ? 'box type' : ''}${missingBoxTypeCount > 0 && missingPackingTypeCount > 0 ? ' and ' : ''}${missingPackingTypeCount > 0 ? 'packing type' : ''}${(missingBoxTypeCount > 0 || missingPackingTypeCount > 0) && missingManufacturingCount > 0 ? ' and ' : ''}${missingManufacturingCount > 0 ? 'manufacturing material' : ''} selections before creating the order.`
          : undefined}
        templateWarningCount={missingTemplateCount}
        onConfirm={handleConfirmCreate}
        isSubmitting={createClientMutation.isPending || createOrderMutation.isPending}
        submitError={submitError}
      />
    </>
  )
}

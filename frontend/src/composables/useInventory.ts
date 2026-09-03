import { ref } from 'vue'
import api from '@/shared/api/client'
import { i18n } from '@/app/i18n'

export interface InventoryItem {
  id: number
  character_id: number
  item_id: number
  qty: number
  condition: number
  equipped: boolean
  fill: number
  slug: string
  name: string
  category: 'garment' | 'provision' | 'ammunition' | 'weapon' | 'tool' | 'container'
  prose_singular: string
  prose_plural: string | null
  effects: Record<string, any>
  effect_when_used: Record<string, any>
  base_price: number | null
  rarity: string
  weight_kg: number
}

export interface InventoryResponse {
  items: InventoryItem[]
  grouped: Record<string, InventoryItem[]>
}

const inventory = ref<InventoryItem[]>([])
const inventoryLoading = ref(false)
const inventoryError = ref<string | null>(null)

export function useInventory() {
  async function fetchInventory(characterId: number) {
    inventoryLoading.value = true
    inventoryError.value = null
    try {
      const response = await api.get<InventoryResponse>(`/character/${characterId}/inventory`)
      inventory.value = response.data.items
    } catch (err: any) {
      inventoryError.value = err.message || i18n.global.t('errors.loadInventory')
      inventory.value = []
    } finally {
      inventoryLoading.value = false
    }
  }

  function clearInventory() {
    inventory.value = []
  }

  return {
    inventory,
    inventoryLoading,
    inventoryError,
    fetchInventory,
    clearInventory,
  }
}

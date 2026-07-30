import { ref } from 'vue'
import api from '@/shared/api/client'

export interface InventoryItem {
  id: number
  character_id: number
  item_id: number
  qty: number
  condition: number
  equipped: boolean
  slug: string
  name: string
  category: 'garment' | 'provision' | 'ammunition' | 'weapon' | 'tool'
  prose_singular: string
  prose_plural: string | null
  effects: Record<string, any>
  base_price: number | null
  rarity: string
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
      inventoryError.value = err.message || 'Failed to load inventory'
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

export const INVENTORY_CHANGED_EVENT = 'farmaexpres:inventory-changed'
export const INVENTORY_CHANGED_STORAGE_KEY = 'farmaexpres:inventory-changed-at'

export const notifyInventoryChanged = () => {
  window.dispatchEvent(new CustomEvent(INVENTORY_CHANGED_EVENT))

  try {
    localStorage.setItem(INVENTORY_CHANGED_STORAGE_KEY, String(Date.now()))
  } catch {
    // no-op
  }
}

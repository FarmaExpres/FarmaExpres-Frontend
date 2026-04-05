export const ALERTS_SECTION_ORDER = Object.freeze([
  {
    key: 'expired',
    title: 'Medicamentos Vencidos',
    shortLabel: 'Vencidos',
    tone: 'danger',
    emptyMessage: 'No hay medicamentos vencidos',
    badgeLabel: 'Vencido'
  },
  {
    key: 'expiringSoon',
    title: 'Próximos a Vencer',
    shortLabel: 'Próximos',
    tone: 'warning',
    emptyMessage: 'No hay medicamentos próximos a vencer',
    badgeLabel: 'Próximo'
  },
  {
    key: 'lowStock',
    title: 'Medicamentos con Bajo Stock',
    shortLabel: 'Bajo stock',
    tone: 'warning',
    emptyMessage: 'No hay medicamentos con bajo stock',
    badgeLabel: 'Bajo stock'
  },
  {
    key: 'outOfStock',
    title: 'Productos Agotados',
    shortLabel: 'Agotados',
    tone: 'danger',
    emptyMessage: 'No hay productos agotados',
    badgeLabel: 'Agotado'
  }
])

export const ALERTS_TONE_CLASSES = Object.freeze({
  danger: {
    card: 'border-red-200',
    sectionHead: 'bg-red-50',
    count: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    tableHead: 'bg-red-50 text-red-700',
    quickNav: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500'
  },
  warning: {
    card: 'border-amber-200',
    sectionHead: 'bg-amber-50',
    count: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    tableHead: 'bg-amber-50 text-amber-700',
    quickNav: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500'
  }
})

export const ALERTS_EMPTY_DATA = Object.freeze({
  expired: [],
  expiringSoon: [],
  lowStock: [],
  outOfStock: []
})

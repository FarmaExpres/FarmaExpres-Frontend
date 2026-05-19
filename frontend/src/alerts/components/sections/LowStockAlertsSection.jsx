import AlertSectionCard from '../AlertSectionCard'

const columns = [
  {
    key: 'codigo',
    label: 'CÓDIGO',
    className: 'whitespace-nowrap',
    render: (row) => (
      <span className="inline-flex h-8 items-center rounded-lg bg-[#eef2fa] px-3 text-xs font-semibold text-[#526180]">
        {row.codigo || '---'}
      </span>
    )
  },
  { key: 'nombre', label: 'MEDICAMENTO', className: 'font-semibold text-[#25385f]', value: (row) => row.nombre || 'Sin nombre' },
  { key: 'lote', label: 'LOTE', className: 'whitespace-nowrap text-[#364b75]', value: (row) => row.loteCodigo || 'Sin lote' },
  { key: 'vencimiento', label: 'VENCIMIENTO', className: 'whitespace-nowrap text-[#5f729a]', value: (row) => row.fechavencimiento || '---' },
  { key: 'stock', label: 'STOCK', className: 'whitespace-nowrap font-semibold tabular-nums text-[#b45309]', value: (row) => row.stock },
  { key: 'minimo', label: 'MÍNIMO', className: 'whitespace-nowrap font-semibold tabular-nums text-[#364b75]', value: (row) => row.stockMinimo }
]

const LowStockAlertsSection = ({ section, rows, isOpen, isLoading, onToggle }) => (
  <AlertSectionCard
    sectionId={`alerts-${section.key}`}
    section={section}
    rows={rows}
    isOpen={isOpen}
    isLoading={isLoading}
    columns={columns}
    onToggle={onToggle}
    renderStatus={(_row, currentSection, tone) => (
      <span className={`fe-badge-chip ${tone.badge}`}>{currentSection.badgeLabel}</span>
    )}
  />
)

export default LowStockAlertsSection

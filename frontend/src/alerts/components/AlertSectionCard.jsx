import { ALERTS_TONE_CLASSES } from '../config/alertsSections.config'

const AlertSectionCard = ({
  sectionId,
  section,
  rows = [],
  isOpen = true,
  isLoading = false,
  columns = [],
  onToggle,
  renderStatus
}) => {
  const tone = ALERTS_TONE_CLASSES[section.tone]

  return (
    <section id={sectionId} className={`mb-3 fe-card overflow-hidden border ${tone.card}`}>
      <button
        type="button"
        onClick={() => onToggle?.(section.key)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left ${tone.sectionHead}`}
      >
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
          <div>
            <p className="text-sm font-semibold text-[#22365e]">{section.title}</p>
            <p className="mt-1 text-xs text-[#5f729a]">
              {rows.length > 0 ? `${rows.length} registro(s) identificados` : section.emptyMessage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-extrabold tracking-tight ${tone.count}`}>{rows.length}</span>
          <span className="text-xl text-[#5e7299]">{isOpen ? '⌃' : '⌄'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[#edf1f9]">
          {isLoading ? (
            <p className="px-4 py-5 text-sm text-[#7684a1]">Cargando sección...</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[#7684a1]">{section.emptyMessage}</p>
          ) : (
            <div className="fe-table-wrap">
              <table className="fe-table table-fixed text-sm">
                <thead className={tone.tableHead}>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="text-left">{column.label}</th>
                    ))}
                    <th className="text-left">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${section.key}-${row.id || row.codigo || row.nombre}`}
                      className={section.key === 'outOfStock' ? 'bg-red-50/50' : ''}
                    >
                      {columns.map((column) => (
                        <td key={`${column.key}-${row.id || row.codigo || row.nombre}`} className={column.className}>
                          {column.render ? column.render(row) : column.value(row)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap text-left">{renderStatus(row, section, tone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default AlertSectionCard

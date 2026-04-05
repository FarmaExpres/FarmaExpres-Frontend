const getTypeClassName = (type) => {
  if (type === 'ENTRANCE') return 'bg-emerald-100 text-emerald-700'
  if (type === 'EXIT' || type === 'DELETED') return 'bg-red-100 text-red-700'
  if (type === 'UPDATED') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

const getQuantityClassName = (quantity) => {
  if (quantity > 0) return 'text-emerald-700'
  if (quantity < 0) return 'text-red-700'
  return 'text-slate-600'
}

const formatQuantity = (quantity) => {
  const numericValue = Number(quantity) || 0
  if (numericValue > 0) return `+${numericValue}`
  if (numericValue < 0) return `${numericValue}`
  return '0'
}

const StatusMarkedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M12 3 2.8 20h18.4L12 3Z" />
    <path d="M12 9.2v4.8M12 17.2h.01" />
  </svg>
)

const IS_DEV = import.meta.env.DEV

const MovementsTable = ({ movements = [], isLoading = false }) => (
  <div className="fe-card fe-table-wrap overflow-x-hidden">
    <table className="fe-table fe-table-compact table-fixed w-full text-[12.5px] lg:text-sm">
      <thead>
        <tr>
          <th className="fe-col-min-sm w-[11%] text-left 2xl:w-[10%]">FECHA</th>
          <th className="hidden w-[9%] text-left 2xl:table-cell">HORA</th>
          <th className="fe-col-min-xs w-[8%] text-left 2xl:w-[8%]">TIPO</th>
          <th className="fe-col-min-md w-[17%] text-left 2xl:w-[16%]">MEDICAMENTO</th>
          <th className="fe-col-min-sm w-[12%] text-left 2xl:w-[12%]">LOTE</th>
          <th className="fe-col-min-xxs w-[8%] text-center 2xl:w-[8%]">CANTIDAD</th>
          <th className="fe-col-min-lg w-[19%] text-left 2xl:w-[18%]">MOTIVO</th>
          <th className="fe-col-min-md w-[15%] text-left 2xl:w-[14%]">USUARIO</th>
          <th className="fe-col-min-sm w-[11%] text-center 2xl:w-[8%]">ESTADO</th>
        </tr>
      </thead>

      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan="9" className="p-5 text-center text-gray-400">
              Cargando historial de movimientos...
            </td>
          </tr>
        ) : Array.isArray(movements) && movements.length > 0 ? (
          movements.map((movement, index) => (
            <tr key={movement.id || `${movement.date}-${movement.time}-${index}`}>
              <td
                className="whitespace-nowrap"
                title={
                  IS_DEV
                    ? `raw: ${movement.rawDateValue || 'N/A'} | parse: ${movement.dateParseMode || 'unknown'} | tz: ${
                      movement.hasExplicitTimezone ? 'explicit' : 'implicit'
                    }`
                    : undefined
                }
              >
                <p className="truncate">{movement.date || '---'}</p>
                <p className="text-[11px] font-medium text-[#8c97b3] 2xl:hidden">{movement.time || '---'}</p>
              </td>
              <td className="hidden whitespace-nowrap 2xl:table-cell">{movement.time || '---'}</td>
              <td className="whitespace-nowrap">
                <span className={`fe-badge-chip ${getTypeClassName(movement.type)}`}>
                  {movement.typeLabel || '---'}
                </span>
              </td>
              <td className="truncate" title={movement.medicine || 'No disponible'}>
                {movement.medicine || 'No disponible'}
              </td>
              <td className="whitespace-nowrap" title={movement.batchCode || 'Sin lote'}>
                <p className="truncate font-semibold text-[#2f3f62]">{movement.batchCode || 'Sin lote'}</p>
                <p className="truncate text-[11px] font-medium text-[#8c97b3]">{movement.batchExpirationDate || 'Sin vencimiento'}</p>
              </td>
              <td className={`whitespace-nowrap text-center font-bold ${getQuantityClassName(movement.quantity)}`}>
                {formatQuantity(movement.quantity)}
              </td>
              <td title={movement.reason || 'No especificado'}>
                <span className="block truncate">{movement.reason || 'No especificado'}</span>
              </td>
              <td title={movement.user || 'No disponible'}>
                <p className="truncate font-semibold text-[#2f3f62]">{movement.user || 'No disponible'}</p>
                <p className="truncate text-[11px] font-medium text-[#8c97b3]">{movement.userRoleLabel || 'Sin rol'}</p>
              </td>
              <td className="whitespace-nowrap text-center">
                {movement.status === 'MARKED' ? (
                  <span className="fe-badge-chip-compact gap-1 bg-red-100 text-red-600">
                    <StatusMarkedIcon />
                    {movement.statusLabel || 'Marcado'}
                  </span>
                ) : (
                  <span className="fe-badge-chip-compact bg-slate-100 text-slate-700">
                    {movement.statusLabel || 'Normal'}
                  </span>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="9" className="p-5 text-center text-gray-400">
              No hay movimientos para los filtros aplicados.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)

export default MovementsTable

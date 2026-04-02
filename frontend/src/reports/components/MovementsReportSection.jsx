const MovementsReportSection = ({ rows = [], isLoading = false }) => (
  <section className="fe-card p-4">
    <h2 className="mb-3 text-[1.35rem] font-bold text-[#1f2e4d]">Reporte de Movimientos</h2>
    <div className="fe-table-wrap">
      <table className="fe-table text-sm">
        <thead>
          <tr>
            <th className="text-left">FECHA</th>
            <th className="text-left">HORA</th>
            <th className="text-left">TIPO</th>
            <th className="text-left">MEDICAMENTO</th>
            <th className="text-center">CANTIDAD</th>
            <th className="text-left">USUARIO</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan="6" className="p-5 text-center text-gray-400">Cargando movimientos...</td></tr>
          ) : rows.length > 0 ? (
            rows.map((item, index) => (
              <tr key={item.id || `${item.date}-${item.time}-${index}`}>
                <td>{item.date}</td>
                <td>{item.time}</td>
                <td>{item.typeLabel}</td>
                <td>{item.medicine}</td>
                <td className={`text-center font-semibold ${item.quantity >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                </td>
                <td>{item.user}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6" className="p-5 text-center text-gray-400">No hay movimientos disponibles.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export default MovementsReportSection


const ExpiringReportSection = ({ rows = [], isLoading = false, onExport, exportDisabled = false, isExporting = false }) => (
  <section className="fe-card p-4">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[1.35rem] font-bold text-[#1f2e4d]">Reporte de Próximos a Vencer</h2>
      <button
        type="button"
        onClick={onExport}
        disabled={exportDisabled || isExporting}
        className="fe-btn-primary h-10 px-4 text-sm disabled:opacity-50"
      >
        {isExporting ? 'Exportando...' : 'Exportar Excel'}
      </button>
    </div>
    <div className="fe-table-wrap">
      <table className="fe-table text-sm">
        <thead>
          <tr>
            <th className="text-left">CÓDIGO</th>
            <th className="text-left">MEDICAMENTO</th>
            <th className="text-center">VENCIMIENTO</th>
            <th className="text-center">DÍAS RESTANTES</th>
            <th className="text-center">STOCK</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">Cargando próximos a vencer...</td></tr>
          ) : rows.length > 0 ? (
            rows.map((item) => (
              <tr key={item.id || `${item.codigo}-${item.nombre}`}>
                <td>{item.codigo}</td>
                <td>{item.nombre}</td>
                <td className="text-center">{item.fechavencimiento || '---'}</td>
                <td className={`text-center font-semibold ${item.daysUntilExpiration <= 15 ? 'text-red-700' : 'text-amber-700'}`}>
                  {item.daysUntilExpiration}
                </td>
                <td className="text-center">{item.stock}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">No hay medicamentos próximos a vencer.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export default ExpiringReportSection

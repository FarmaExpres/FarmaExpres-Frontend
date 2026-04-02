const ByUserReportSection = ({ rows = [], isLoading = false, onExport, exportDisabled = false, isExporting = false }) => (
  <section className="fe-card p-4">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[1.35rem] font-bold text-[#1f2e4d]">Reporte por Usuario</h2>
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
            <th className="text-left">USUARIO</th>
            <th className="text-left">ROL</th>
            <th className="text-center">MOVIMIENTOS</th>
            <th className="text-center">ENTRADAS</th>
            <th className="text-center">SALIDAS</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">Cargando reporte por usuario...</td></tr>
          ) : rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`${row.user}-${row.roleLabel}-${index}`}>
                <td>{row.user}</td>
                <td>{row.roleLabel}</td>
                <td className="text-center font-semibold">{row.totalMovements}</td>
                <td className="text-center text-emerald-700">{row.entrances}</td>
                <td className="text-center text-red-700">{row.exits}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">No hay datos por usuario.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export default ByUserReportSection

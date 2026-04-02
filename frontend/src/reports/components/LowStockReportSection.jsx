const LowStockReportSection = ({ rows = [], isLoading = false }) => (
  <section className="fe-card p-4">
    <h2 className="mb-3 text-[1.35rem] font-bold text-[#1f2e4d]">Reporte de Bajo Stock</h2>
    <div className="fe-table-wrap">
      <table className="fe-table text-sm">
        <thead>
          <tr>
            <th className="text-left">CÓDIGO</th>
            <th className="text-left">MEDICAMENTO</th>
            <th className="text-center">STOCK</th>
            <th className="text-center">MÍNIMO</th>
            <th className="text-left">SUGERENCIA</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">Cargando bajo stock...</td></tr>
          ) : rows.length > 0 ? (
            rows.map((item) => {
              const shortage = Math.max((item.stockMinimo * 2) - item.stock, 1)
              return (
                <tr key={item.id || `${item.codigo}-${item.nombre}`}>
                  <td>{item.codigo}</td>
                  <td>{item.nombre}</td>
                  <td className="text-center font-semibold text-red-700">{item.stock}</td>
                  <td className="text-center">{item.stockMinimo}</td>
                  <td className="text-[#9b1c1c]">Reponer {shortage} unidades</td>
                </tr>
              )
            })
          ) : (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">No hay productos en bajo stock.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export default LowStockReportSection


import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeRole, ROLES } from '../../shared/constants/roles'
import {
  cleanPredictionData,
  getPredictionHealth,
  getPredictionMetrics,
  getPredictions,
  ingestInventorySnapshot,
  recalculatePredictions,
  trainPredictionModel
} from '../services/predictions.service'

const numberFormatter = new Intl.NumberFormat('es-CO')
const formatNumber = (value) => numberFormatter.format(Number(value) || 0)

const INITIAL_HEALTH = Object.freeze({
  status: 'degraded',
  mongo: false,
  database: 'sin base',
  counts: {
    rawData: 0,
    cleanedData: 0,
    predictions: 0,
    metrics: 0,
    productsSnapshot: 0
  },
  pipeline: {
    readyToClean: false,
    readyToTrain: false,
    hasPredictions: false
  }
})

const INITIAL_METRICS = Object.freeze({
  explanation: 'Predicción de demanda con promedio móvil de salidas históricas.',
  trainedAt: null,
  method: '30_day_moving_average',
  horizonDays: 7,
  productsEvaluated: 0,
  validRecordsUsed: 0,
  averageMae: null,
  highRiskCount: 0,
  outOfStockCount: 0,
  cleaning: {
    inputRecords: 0,
    cleanedRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    duplicatesRemoved: 0
  }
})

const ACTION_DISABLED_MESSAGE = 'Para ejecutar esta acción inicia sesión como administrador o auditor.'

const RISK_CONFIG = {
  out: {
    label: 'Sin stock',
    className: 'bg-red-100 text-red-700',
    rowClassName: 'border-red-100 bg-red-50',
    barClassName: 'bg-red-500'
  },
  high: {
    label: 'Alto',
    className: 'bg-rose-100 text-rose-700',
    rowClassName: 'border-rose-100 bg-rose-50',
    barClassName: 'bg-rose-500'
  },
  medium: {
    label: 'Medio',
    className: 'bg-amber-100 text-amber-700',
    rowClassName: 'border-amber-100 bg-amber-50',
    barClassName: 'bg-amber-500'
  },
  low: {
    label: 'Bajo',
    className: 'bg-emerald-100 text-emerald-700',
    rowClassName: 'border-emerald-100 bg-emerald-50',
    barClassName: 'bg-emerald-500'
  }
}

const getRiskConfig = (riskKey) => RISK_CONFIG[riskKey] || RISK_CONFIG.low

const PredictionActionButton = ({
  children,
  variant = 'muted',
  canManage,
  disabled,
  onClick
}) => {
  const isDisabled = disabled || !canManage
  const className = variant === 'primary'
    ? 'fe-btn-primary h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60'
    : variant === 'dark'
      ? 'h-10 rounded-lg bg-[#243858] px-4 text-sm font-extrabold text-white transition hover:bg-[#17233d] disabled:cursor-not-allowed disabled:opacity-60'
      : 'fe-btn-muted h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={!canManage ? ACTION_DISABLED_MESSAGE : undefined}
      aria-disabled={isDisabled}
      className={className}
    >
      {children}
    </button>
  )
}

const normalizeSearch = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const formatDateTime = (value) => {
  if (!value) return 'Sin entrenamiento'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin entrenamiento'
  return date.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const FlowMessage = ({ type = 'info', children }) => {
  const className = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-blue-200 bg-blue-50 text-blue-700'

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  )
}

const RiskBadge = ({ riskKey }) => {
  const config = getRiskConfig(riskKey)
  return <span className={`fe-badge-chip min-w-[86px] justify-center ${config.className}`}>{config.label}</span>
}

const MetricCard = ({ label, value, detail, tone = 'text-[#1f3561]' }) => (
  <article className="rounded-xl border border-[#e4eaf6] bg-white p-4">
    <p className="text-xs font-extrabold uppercase tracking-normal text-[#7b89a6]">{label}</p>
    <p className={`mt-2 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
    {detail && <p className="mt-1 text-xs font-semibold text-[#6b7a99]">{detail}</p>}
  </article>
)

const DemandChart = ({ rows = [] }) => {
  const topRows = rows.slice(0, 8)
  const maxDemand = Math.max(...topRows.map((row) => row.predictedDemandUnits), 1)

  return (
    <section className="rounded-xl border border-[#e4eaf6] bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#17233d]">Demanda esperada</h2>
          <p className="text-sm font-semibold text-[#7181a2]">Medicamentos con mayor salida proyectada a 7 días.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {topRows.length > 0 ? topRows.map((row) => {
          const width = Math.max(4, Math.round((row.predictedDemandUnits / maxDemand) * 100))
          return (
            <div key={row.productId || row.productName} className="grid grid-cols-[minmax(128px,0.72fr)_minmax(120px,1fr)_48px] items-center gap-3 text-sm">
              <span className="truncate font-bold text-[#304363]" title={row.productName}>{row.productName}</span>
              <span className="h-3 overflow-hidden rounded-full bg-[#edf1f8]">
                <span className={`block h-full rounded-full ${getRiskConfig(row.riskKey).barClassName}`} style={{ width: `${width}%` }} />
              </span>
              <span className="text-right font-extrabold tabular-nums text-[#1f2e4d]">{formatNumber(row.predictedDemandUnits)}</span>
            </div>
          )
        }) : (
          <FlowMessage>No hay predicciones todavía. Sincroniza inventario, limpia datos y recalcula el modelo.</FlowMessage>
        )}
      </div>
    </section>
  )
}

const PriorityPanel = ({ rows = [] }) => {
  const priorityRows = rows
    .filter((row) => ['out', 'high', 'medium'].includes(row.riskKey))
    .slice(0, 6)

  return (
    <section className="rounded-xl border border-[#e4eaf6] bg-white p-4">
      <h2 className="text-base font-extrabold text-[#17233d]">Prioridad de reposición</h2>
      <p className="text-sm font-semibold text-[#7181a2]">Productos donde la demanda esperada puede superar el stock disponible.</p>

      <div className="mt-4 space-y-3">
        {priorityRows.length > 0 ? priorityRows.map((row) => (
          <article key={row.productId || row.productName} className={`rounded-lg border px-4 py-3 ${getRiskConfig(row.riskKey).rowClassName}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#243858]" title={row.productName}>{row.productName}</p>
                <p className="mt-1 text-xs font-semibold text-[#667694]">
                  Demanda {formatNumber(row.predictedDemandUnits)} uds · stock {formatNumber(row.currentStock)} · mínimo {formatNumber(row.minimumStock)}
                </p>
              </div>
              <RiskBadge riskKey={row.riskKey} />
            </div>
          </article>
        )) : (
          <FlowMessage type="success">No hay productos críticos en la predicción actual.</FlowMessage>
        )}
      </div>
    </section>
  )
}

const PredictionsTable = ({ rows = [], searchTerm, onSearchChange }) => {
  const filteredRows = useMemo(() => {
    const search = normalizeSearch(searchTerm)
    if (!search) return rows
    return rows.filter((row) => normalizeSearch(`${row.productName} ${row.productCode} ${row.category}`).includes(search))
  }, [rows, searchTerm])

  return (
    <section className="fe-card overflow-hidden p-0">
      <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#17233d]">Tabla de predicciones</h2>
            <p className="text-sm font-semibold text-[#7181a2]">{formatNumber(filteredRows.length)} medicamentos evaluados</p>
          </div>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="fe-input h-10 md:max-w-xs"
            placeholder="Buscar medicamento..."
          />
        </div>
      </div>

      <div className="fe-table-wrap">
        <table className="fe-table table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Medicamento</th>
              <th className="text-left">Código</th>
              <th className="text-left">Stock</th>
              <th className="text-left">Demanda</th>
              <th className="text-left">Agotamiento</th>
              <th className="text-left">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? filteredRows.map((row) => (
              <tr key={row.productId || `${row.productCode}-${row.productName}`}>
                <td className="truncate font-semibold text-[#23365d]" title={row.productName}>{row.productName}</td>
                <td className="truncate font-semibold text-[#52658b]" title={row.productCode}>{row.productCode || row.productId}</td>
                <td className="font-extrabold tabular-nums text-[#263b63]">{formatNumber(row.currentStock)}</td>
                <td className="font-extrabold tabular-nums text-[#263b63]">{formatNumber(row.predictedDemandUnits)}</td>
                <td className="font-semibold text-[#52658b]">
                  {row.estimatedStockoutDays ? `${row.estimatedStockoutDays} días` : 'No estimado'}
                </td>
                <td><RiskBadge riskKey={row.riskKey} /></td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="p-5 text-center text-gray-400">No hay predicciones para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const PredictionsPage = ({ session }) => {
  const [health, setHealth] = useState(INITIAL_HEALTH)
  const [metrics, setMetrics] = useState(INITIAL_METRICS)
  const [predictions, setPredictions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRunningAction, setIsRunningAction] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const role = normalizeRole(session?.role)
  const canManageModel = [ROLES.ADMIN, ROLES.AUDITOR].includes(role)

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true)
    setError('')

    try {
      const [nextHealth, nextPredictions, nextMetrics] = await Promise.all([
        getPredictionHealth(session?.token),
        getPredictions(session?.token),
        getPredictionMetrics(session?.token)
      ])
      setHealth(nextHealth)
      setPredictions(nextPredictions)
      setMetrics(nextMetrics)
    } catch (loadError) {
      setError(loadError?.message || 'No se pudo cargar el módulo predictivo.')
      setPredictions([])
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [session?.token])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!message && !error) return undefined
    const timer = window.setTimeout(() => {
      setMessage('')
      setError('')
    }, 5200)
    return () => window.clearTimeout(timer)
  }, [error, message])

  const runAction = async (label, action, successMessage) => {
    setIsRunningAction(true)
    setError('')
    setMessage(`${label} en proceso...`)
    try {
      await action()
      await loadDashboard({ silent: true })
      setMessage(successMessage)
    } catch (actionError) {
      setError(actionError?.message || `No se pudo completar: ${label}.`)
    } finally {
      setIsRunningAction(false)
    }
  }

  const riskSummary = useMemo(() => ({
    out: predictions.filter((row) => row.riskKey === 'out').length,
    high: predictions.filter((row) => row.riskKey === 'high').length,
    medium: predictions.filter((row) => row.riskKey === 'medium').length
  }), [predictions])

  const serviceState = health.status === 'ok' && health.mongo
    ? 'Servicio predictivo activo'
    : 'Servicio predictivo no disponible'

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Predicciones de inventario</h1>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${health.mongo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {serviceState}
        </span>
      </div>

      <section className="rounded-xl border border-[#dfe7f3] bg-white p-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <h2 className="text-lg font-extrabold text-[#17233d]">Demanda esperada para los próximos 7 días</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#667694]">
              El módulo toma movimientos de salida del inventario como señal de demanda, limpia duplicados y registros inválidos,
              calcula un promedio móvil de 30 días y prioriza medicamentos que podrían quedarse sin stock.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-normal text-blue-700">Flujo actual</p>
            <p className="mt-1 text-sm font-bold text-[#1f3561]">
              Crudos {formatNumber(health.counts.rawData)} · limpios {formatNumber(health.counts.cleanedData)} · predicciones {formatNumber(health.counts.predictions)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#667694]">Base MongoDB: {health.database}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
            <PredictionActionButton
              canManage={canManageModel}
              onClick={() => runAction(
                'Sincronización de inventario',
                () => ingestInventorySnapshot(session?.token),
                'Inventario sincronizado en MongoDB. Ahora puedes limpiar y recalcular el modelo.'
              )}
              disabled={isRunningAction || isLoading}
              variant="primary"
            >
              Sincronizar inventario
            </PredictionActionButton>
            <PredictionActionButton
              canManage={canManageModel}
              onClick={() => runAction(
                'Limpieza de datos',
                () => cleanPredictionData(session?.token),
                'Datos limpios generados correctamente para el modelo predictivo.'
              )}
              disabled={isRunningAction || isLoading}
            >
              Limpiar datos
            </PredictionActionButton>
            <PredictionActionButton
              canManage={canManageModel}
              onClick={() => runAction(
                'Recalcular predicción',
                () => trainPredictionModel(session?.token, 7),
                'Predicción recalculada con promedio móvil de 30 días.'
              )}
              disabled={isRunningAction || isLoading}
            >
              Entrenar modelo
            </PredictionActionButton>
            <PredictionActionButton
              canManage={canManageModel}
              onClick={() => runAction(
                'Flujo predictivo',
                () => recalculatePredictions(session?.token, 7),
                'Limpieza y predicción recalculadas correctamente.'
              )}
              disabled={isRunningAction || isLoading}
              variant="dark"
            >
              Recalcular flujo
            </PredictionActionButton>
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={isRunningAction || isLoading}
              className="fe-btn-muted h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Actualizar tablero
            </button>
        </div>

        {!canManageModel && (
          <div className="mt-3">
            <FlowMessage>Tu rol permite consultar predicciones. Las acciones del modelo se muestran para explicar el flujo, pero solo administrador o auditor pueden ejecutarlas.</FlowMessage>
          </div>
        )}
      </section>

      {message && <div className="mt-4"><FlowMessage type="success">{message}</FlowMessage></div>}
      {error && <div className="mt-4"><FlowMessage type="error">{error}</FlowMessage></div>}

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Crudos" value={formatNumber(health.counts.rawData)} detail="raw_data" />
        <MetricCard label="Limpios" value={formatNumber(health.counts.cleanedData)} detail="cleaned_data" />
        <MetricCard label="Predicciones" value={formatNumber(predictions.length)} detail="medicamentos" />
        <MetricCard label="Riesgo alto" value={formatNumber(riskSummary.out + riskSummary.high)} detail={`${formatNumber(riskSummary.out)} sin stock`} tone="text-red-700" />
        <MetricCard label="Error medio" value={metrics.averageMae ?? '--'} detail="MAE aproximado" tone="text-[#6d3ff1]" />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <DemandChart rows={predictions} />
        <PriorityPanel rows={predictions} />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Registros válidos" value={formatNumber(metrics.cleaning.validRecords)} detail="usados para el cálculo" />
        <MetricCard label="Registros con alerta" value={formatNumber(metrics.cleaning.invalidRecords)} detail="calidad de datos" tone="text-amber-700" />
        <MetricCard
          label="Último entrenamiento"
          value={metrics.trainedAt ? 'Calculado' : 'Pendiente'}
          detail={`${formatDateTime(metrics.trainedAt)} · ${metrics.method.replaceAll('_', ' ')}`}
        />
      </section>

      <div className="mt-5">
        <PredictionsTable rows={predictions} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>
    </div>
  )
}

export default PredictionsPage

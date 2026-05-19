import { ALERTS_SECTION_ORDER, ALERTS_TONE_CLASSES } from '../config/alertsSections.config'

const AlertsSummaryBar = ({ totalAlerts = 0, sectionsData = {}, onNavigateToSection }) => {
  return (
    <section className="mb-3 fe-card border border-[#dbe4f7] bg-[#f8faff] p-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Resumen Operativo</p>
          <p className="mt-1 text-lg font-bold text-[#1f3561]">
            Alertas activas: <span className="text-[var(--fe-danger)]">{totalAlerts}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {ALERTS_SECTION_ORDER.map((section) => {
            const count = sectionsData[section.key]?.length || 0
            const tone = ALERTS_TONE_CLASSES[section.tone]

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onNavigateToSection?.(section.key)}
                className={`rounded-lg border px-3 py-2 text-left transition hover:brightness-95 ${tone.quickNav}`}
              >
                <p className="text-xs font-semibold">{section.shortLabel}</p>
                <p className="text-xl font-extrabold leading-none">{count}</p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default AlertsSummaryBar

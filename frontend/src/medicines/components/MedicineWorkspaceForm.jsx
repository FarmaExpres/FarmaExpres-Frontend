import { useEffect, useMemo, useState } from 'react'
import {
  FORMA_FARMACEUTICA_LABELS,
  FORMA_FARMACEUTICA_OPTIONS,
  TEMPERATURA_CONSERVACION_LABELS,
  TEMPERATURA_CONSERVACION_OPTIONS,
  UNIDAD_MEDIDA_LABELS,
  UNIDAD_MEDIDA_OPTIONS,
  VIA_ADMINISTRACION_LABELS,
  VIA_ADMINISTRACION_OPTIONS
} from '../config/medicineFormOptions'

const FORM_TABS = [
  { key: 'general', label: 'General', description: 'Identificación y clasificación del medicamento' },
  { key: 'inventario', label: 'Inventario', description: 'Stock, precios, ubicación y vencimiento' },
  { key: 'regulatorio', label: 'Regulatorio', description: 'Receta, registro y observaciones' }
]

const TAB_FIELDS = {
  general: ['code', 'commercialName', 'nombreGenerico', 'concentracion', 'formaFarmaceutica', 'presentacion', 'unidadMedida', 'viaAdministracion'],
  inventario: ['ubicacionAlmacen', 'temperaturaConservacion', 'stockMaximo', 'stock', 'minimumStock', 'precioCompra', 'precioVenta', 'expirationDate'],
  regulatorio: ['requiereReceta', 'laboratorio', 'registroSanitario', 'observaciones']
}

const getTodayIsoDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const isDateInPast = (value) => {
  const selectedDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return selectedDate < startOfToday
}

const validateForm = (formValues, { isCreate }) => {
  const errors = {}

  if (isCreate && !formValues.code.trim()) {
    errors.code = 'El código es obligatorio.'
  }

  if (!formValues.commercialName.trim()) errors.commercialName = 'El nombre comercial es obligatorio.'
  if (!formValues.nombreGenerico.trim()) errors.nombreGenerico = 'El nombre genérico es obligatorio.'
  if (!formValues.concentracion.trim()) errors.concentracion = 'La concentración es obligatoria.'
  if (!formValues.formaFarmaceutica.trim()) errors.formaFarmaceutica = 'La forma farmacéutica es obligatoria.'
  if (!formValues.presentacion.trim()) errors.presentacion = 'La presentación es obligatoria.'
  if (!formValues.unidadMedida.trim()) errors.unidadMedida = 'La unidad de medida es obligatoria.'
  if (!formValues.viaAdministracion.trim()) errors.viaAdministracion = 'La vía de administración es obligatoria.'
  if (!formValues.ubicacionAlmacen.trim()) errors.ubicacionAlmacen = 'La ubicación principal de almacén es obligatoria.'
  if (!formValues.temperaturaConservacion.trim()) errors.temperaturaConservacion = 'La temperatura de conservación es obligatoria.'
  if (formValues.requiereReceta === '') errors.requiereReceta = 'Debes indicar si requiere receta.'

  const stockMaximo = Number(formValues.stockMaximo)
  if (formValues.stockMaximo === '' || !Number.isInteger(stockMaximo) || stockMaximo < 0) {
    errors.stockMaximo = 'El stock máximo debe ser un entero mayor o igual a 0.'
  }

  if (isCreate) {
    const stock = Number(formValues.stock)
    if (formValues.stock === '' || !Number.isInteger(stock) || stock < 0) {
      errors.stock = 'El stock debe ser un entero mayor o igual a 0.'
    } else if (Number.isInteger(stockMaximo) && stockMaximo > 0 && stock > stockMaximo) {
      errors.stock = 'El stock no puede superar el stock máximo.'
    }
  }

  const minimumStock = Number(formValues.minimumStock)
  if (formValues.minimumStock === '' || !Number.isInteger(minimumStock) || minimumStock < 0) {
    errors.minimumStock = 'El stock mínimo debe ser un entero mayor o igual a 0.'
  } else if (Number.isInteger(stockMaximo) && stockMaximo > 0 && minimumStock > stockMaximo) {
    errors.minimumStock = 'El stock mínimo no puede superar el stock máximo.'
  }

  const precioCompra = Number(formValues.precioCompra)
  if (formValues.precioCompra === '' || Number.isNaN(precioCompra) || precioCompra < 0) {
    errors.precioCompra = 'El precio de compra debe ser un número mayor o igual a 0.'
  }

  const precioVenta = Number(formValues.precioVenta)
  if (formValues.precioVenta === '' || Number.isNaN(precioVenta) || precioVenta < 0) {
    errors.precioVenta = 'El precio de salida debe ser un número mayor o igual a 0.'
  }

  if (isCreate) {
    if (!isValidDate(formValues.expirationDate)) {
      errors.expirationDate = 'La fecha de vencimiento es obligatoria y debe ser válida.'
    } else if (isDateInPast(formValues.expirationDate)) {
      errors.expirationDate = 'No se permite registrar medicamentos con fecha de vencimiento anterior a hoy.'
    }
  }

  return errors
}

const toPayload = (formValues, { isCreate }) => {
  const requiresPrescription = formValues.requiereReceta === 'SI'

  const payload = {
    name: formValues.commercialName.trim(),
    nombreGenerico: formValues.nombreGenerico.trim(),
    concentracion: formValues.concentracion.trim(),
    formaFarmaceutica: formValues.formaFarmaceutica.trim(),
    presentacion: formValues.presentacion.trim(),
    unidadMedida: formValues.unidadMedida.trim(),
    viaAdministracion: formValues.viaAdministracion.trim(),
    ubicacionAlmacen: formValues.ubicacionAlmacen.trim(),
    temperaturaConservacion: formValues.temperaturaConservacion.trim(),
    stockMaximo: Number(formValues.stockMaximo),
    minimumStock: Number(formValues.minimumStock),
    precioCompra: Number(formValues.precioCompra),
    precioVenta: Number(formValues.precioVenta),
    unitPrice: Number(formValues.precioVenta),
    requiereReceta: requiresPrescription,
    laboratorio: formValues.laboratorio.trim(),
    registroSanitario: formValues.registroSanitario.trim(),
    observaciones: formValues.observaciones.trim()
  }

  if (isCreate) {
    payload.code = formValues.code.trim()
    payload.active = true
    payload.stock = Number(formValues.stock)
    payload.expirationDate = formValues.expirationDate
  }

  return payload
}

const buildComparableForEdit = (formValues = {}) => ({
  ...toPayload(formValues, { isCreate: false }),
  // Evita diferencias por espacios y por tipos al comparar edición.
  name: String(formValues?.commercialName ?? '').trim(),
  nombreGenerico: String(formValues?.nombreGenerico ?? '').trim(),
  concentracion: String(formValues?.concentracion ?? '').trim(),
  formaFarmaceutica: String(formValues?.formaFarmaceutica ?? '').trim(),
  presentacion: String(formValues?.presentacion ?? '').trim(),
  unidadMedida: String(formValues?.unidadMedida ?? '').trim(),
  viaAdministracion: String(formValues?.viaAdministracion ?? '').trim(),
  ubicacionAlmacen: String(formValues?.ubicacionAlmacen ?? '').trim(),
  temperaturaConservacion: String(formValues?.temperaturaConservacion ?? '').trim(),
  laboratorio: String(formValues?.laboratorio ?? '').trim(),
  registroSanitario: String(formValues?.registroSanitario ?? '').trim(),
  observaciones: String(formValues?.observaciones ?? '').trim()
})

const getFirstErrorTab = (errors) => {
  const errorKeys = Object.keys(errors)
  if (errorKeys.length === 0) return null
  return FORM_TABS.find((tab) => TAB_FIELDS[tab.key].some((field) => errorKeys.includes(field)))?.key || null
}

const MedicineWorkspaceForm = ({
  title,
  submitLabel,
  initialValues,
  draftStorageKey = '',
  isCreate = false,
  isSaving = false,
  submitError = '',
  inventoryReadOnlyExpirationLabel = '',
  inventoryReadOnlyBatchCode = '',
  onCancel,
  onSubmit
}) => {
  const [form, setForm] = useState(() => {
    if (!draftStorageKey) return initialValues

    try {
      const rawDraft = sessionStorage.getItem(draftStorageKey)
      if (!rawDraft) return initialValues
      const parsedDraft = JSON.parse(rawDraft)
      if (!(parsedDraft?.form && typeof parsedDraft.form === 'object')) return initialValues

      const mergedForm = { ...initialValues, ...parsedDraft.form }
      if (!isCreate) {
        // En edición estos campos son de solo lectura y deben mantenerse desde backend.
        mergedForm.stock = initialValues.stock
        mergedForm.expirationDate = initialValues.expirationDate
      }
      return mergedForm
    } catch {
      return initialValues
    }
  })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(() => {
    if (!draftStorageKey) return 'general'

    try {
      const rawDraft = sessionStorage.getItem(draftStorageKey)
      if (!rawDraft) return 'general'
      const parsedDraft = JSON.parse(rawDraft)
      const nextActiveTab = String(parsedDraft?.activeTab || '').trim()
      return FORM_TABS.some((tab) => tab.key === nextActiveTab) ? nextActiveTab : 'general'
    } catch {
      return 'general'
    }
  })
  const minExpirationDate = getTodayIsoDate()
  const hasPendingChanges = useMemo(() => {
    if (isCreate) return true
    return JSON.stringify(buildComparableForEdit(form)) !== JSON.stringify(buildComparableForEdit(initialValues))
  }, [form, initialValues, isCreate])
  const getOptionsWithFallback = (value, options) => {
    const normalizedValue = String(value || '').trim()
    if (normalizedValue && !options.includes(normalizedValue)) {
      return [normalizedValue, ...options]
    }
    return options
  }

  const availableFormaOptions = getOptionsWithFallback(form.formaFarmaceutica, FORMA_FARMACEUTICA_OPTIONS)
  const availableUnitMeasureOptions = getOptionsWithFallback(form.unidadMedida, UNIDAD_MEDIDA_OPTIONS)
  const availableViaOptions = getOptionsWithFallback(form.viaAdministracion, VIA_ADMINISTRACION_OPTIONS)
  const availableTemperatureOptions = getOptionsWithFallback(form.temperaturaConservacion, TEMPERATURA_CONSERVACION_OPTIONS)

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  useEffect(() => {
    if (!draftStorageKey) return

    try {
      sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          form,
          activeTab
        })
      )
    } catch {
      // no-op
    }
  }, [activeTab, draftStorageKey, form])

  const handleSubmit = async () => {
    const validationErrors = validateForm(form, { isCreate })
    setErrors(validationErrors)

    const firstErrorTab = getFirstErrorTab(validationErrors)
    if (firstErrorTab) {
      setActiveTab(firstErrorTab)
      return
    }

    await onSubmit(toPayload(form, { isCreate }))
  }

  const inputClassName = 'fe-input'
  const errorClassName = 'mt-1 text-xs text-red-600'

  return (
    <section className="fe-card overflow-hidden border border-[#dde6f3] p-0">
      <div className="border-b border-[#e5ebf5] px-6 pb-4 pt-5">
        <h1 className="text-2xl font-bold text-[#16274a]">{title}</h1>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {FORM_TABS.map((tab, index) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-[#2751ff] bg-[#eef2ff] shadow-[inset_0_0_0_1px_rgba(39,81,255,0.15)]'
                    : 'border-[#dce4f2] bg-white hover:border-[#c7d4ec] hover:bg-[#f8faff]'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-[#2751ff]' : 'text-[#7a8fb3]'}`}>
                  Paso {index + 1}
                </p>
                <p className={`mt-1 text-sm font-semibold ${isActive ? 'text-[#1f3160]' : 'text-[#2b3f6b]'}`}>{tab.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 py-5">
        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {activeTab === 'general' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="code">Código del medicamento</label>
              <input
                id="code"
                name="code"
                value={form.code}
                onChange={handleChange}
                className={isCreate ? inputClassName : `${inputClassName} cursor-not-allowed bg-[#f2f5fb] text-[#6c7994]`}
                readOnly={!isCreate}
                disabled={!isCreate}
              />
              {errors.code && <p className={errorClassName}>{errors.code}</p>}
            </div>

            <div>
              <label htmlFor="commercialName">Nombre comercial</label>
              <input id="commercialName" name="commercialName" value={form.commercialName} onChange={handleChange} className={inputClassName} />
              {errors.commercialName && <p className={errorClassName}>{errors.commercialName}</p>}
            </div>

            <div>
              <label htmlFor="nombreGenerico">Nombre genérico</label>
              <input id="nombreGenerico" name="nombreGenerico" value={form.nombreGenerico} onChange={handleChange} className={inputClassName} />
              {errors.nombreGenerico && <p className={errorClassName}>{errors.nombreGenerico}</p>}
            </div>

            <div>
              <label htmlFor="concentracion">Concentración</label>
              <input id="concentracion" name="concentracion" value={form.concentracion} onChange={handleChange} className={inputClassName} placeholder="Ej: 500 mg" />
              {errors.concentracion && <p className={errorClassName}>{errors.concentracion}</p>}
            </div>

            <div>
              <label htmlFor="formaFarmaceutica">Forma farmacéutica</label>
              <select id="formaFarmaceutica" name="formaFarmaceutica" value={form.formaFarmaceutica} onChange={handleChange} className={inputClassName}>
                <option value="">Seleccionar</option>
                {availableFormaOptions.map((option) => (
                  <option key={option} value={option}>
                    {FORMA_FARMACEUTICA_LABELS[option] || option}
                  </option>
                ))}
              </select>
              {errors.formaFarmaceutica && <p className={errorClassName}>{errors.formaFarmaceutica}</p>}
            </div>

            <div>
              <label htmlFor="presentacion">Presentación</label>
              <input id="presentacion" name="presentacion" value={form.presentacion} onChange={handleChange} className={inputClassName} />
              {errors.presentacion && <p className={errorClassName}>{errors.presentacion}</p>}
            </div>

            <div>
              <label htmlFor="unidadMedida">Unidad de medida</label>
              <select id="unidadMedida" name="unidadMedida" value={form.unidadMedida} onChange={handleChange} className={inputClassName}>
                <option value="">Seleccionar</option>
                {availableUnitMeasureOptions.map((option) => (
                  <option key={option} value={option}>
                    {UNIDAD_MEDIDA_LABELS[option] || option}
                  </option>
                ))}
              </select>
              {errors.unidadMedida && <p className={errorClassName}>{errors.unidadMedida}</p>}
            </div>

            <div>
              <label htmlFor="viaAdministracion">Vía de administración</label>
              <select id="viaAdministracion" name="viaAdministracion" value={form.viaAdministracion} onChange={handleChange} className={inputClassName}>
                <option value="">Seleccionar</option>
                {availableViaOptions.map((option) => (
                  <option key={option} value={option}>
                    {VIA_ADMINISTRACION_LABELS[option] || option}
                  </option>
                ))}
              </select>
              {errors.viaAdministracion && <p className={errorClassName}>{errors.viaAdministracion}</p>}
            </div>
          </div>
        )}

        {activeTab === 'inventario' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ubicacionAlmacen">Ubicación almacén principal</label>
              <input id="ubicacionAlmacen" name="ubicacionAlmacen" value={form.ubicacionAlmacen} onChange={handleChange} className={inputClassName} />
              {errors.ubicacionAlmacen && <p className={errorClassName}>{errors.ubicacionAlmacen}</p>}
            </div>

            <div>
              <label htmlFor="temperaturaConservacion">Temperatura de conservación</label>
              <select id="temperaturaConservacion" name="temperaturaConservacion" value={form.temperaturaConservacion} onChange={handleChange} className={inputClassName}>
                <option value="">Seleccionar</option>
                {availableTemperatureOptions.map((option) => (
                  <option key={option} value={option}>
                    {TEMPERATURA_CONSERVACION_LABELS[option] || option}
                  </option>
                ))}
              </select>
              {errors.temperaturaConservacion && <p className={errorClassName}>{errors.temperaturaConservacion}</p>}
            </div>

            <div>
              <label htmlFor="stockMaximo">Stock máximo</label>
              <input id="stockMaximo" type="number" name="stockMaximo" value={form.stockMaximo} onChange={handleChange} className={inputClassName} />
              {errors.stockMaximo && <p className={errorClassName}>{errors.stockMaximo}</p>}
            </div>

            <div>
              <label htmlFor="stock">{isCreate ? 'Stock inicial' : 'Stock'}</label>
              <input
                id="stock"
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                className={isCreate ? inputClassName : `${inputClassName} cursor-not-allowed bg-[#f2f5fb] text-[#6c7994]`}
                readOnly={!isCreate}
                disabled={!isCreate}
              />
              {errors.stock && <p className={errorClassName}>{errors.stock}</p>}
            </div>

            <div>
              <label htmlFor="minimumStock">Stock mínimo</label>
              <input id="minimumStock" type="number" name="minimumStock" value={form.minimumStock} onChange={handleChange} className={inputClassName} />
              {errors.minimumStock && <p className={errorClassName}>{errors.minimumStock}</p>}
            </div>

            <div>
              <label htmlFor="precioCompra">Precio compra</label>
              <input id="precioCompra" type="number" step="0.01" name="precioCompra" value={form.precioCompra} onChange={handleChange} className={inputClassName} />
              {errors.precioCompra && <p className={errorClassName}>{errors.precioCompra}</p>}
            </div>

            <div>
              <label htmlFor="precioVenta">Precio salida</label>
              <input id="precioVenta" type="number" step="0.01" name="precioVenta" value={form.precioVenta} onChange={handleChange} className={inputClassName} />
              {errors.precioVenta && <p className={errorClassName}>{errors.precioVenta}</p>}
            </div>

            <div>
              <label htmlFor="expirationDate">
                {isCreate ? 'Fecha de vencimiento' : 'Próximo vencimiento'}
              </label>
              {isCreate ? (
                <input
                  id="expirationDate"
                  type="date"
                  name="expirationDate"
                  value={form.expirationDate}
                  onChange={handleChange}
                  min={minExpirationDate}
                  className={inputClassName}
                />
              ) : (
                <input
                  id="expirationDate"
                  type="text"
                  name="expirationReference"
                  value={inventoryReadOnlyExpirationLabel || 'Sin lotes activos'}
                  className={`${inputClassName} cursor-not-allowed bg-[#f2f5fb] text-[#6c7994]`}
                  readOnly
                  disabled
                />
              )}
              {!isCreate && (
                <>
                  <p className="mt-1 text-xs font-semibold text-[#5d7198]">
                    Lote: {inventoryReadOnlyBatchCode || 'Sin lote activo'}
                  </p>
                  <p className="mt-1 text-xs text-[#7a8cae]">
                    Referencia informativa tomada del lote activo más próximo a vencer.
                  </p>
                </>
              )}
              {errors.expirationDate && <p className={errorClassName}>{errors.expirationDate}</p>}
            </div>
          </div>
        )}

        {activeTab === 'regulatorio' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="requiereReceta">¿Requiere receta?</label>
              <select id="requiereReceta" name="requiereReceta" value={form.requiereReceta} onChange={handleChange} className={inputClassName}>
                <option value="">Seleccionar</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
              {errors.requiereReceta && <p className={errorClassName}>{errors.requiereReceta}</p>}
            </div>

            <div>
              <label htmlFor="laboratorio">Laboratorio (opcional)</label>
              <input id="laboratorio" name="laboratorio" value={form.laboratorio} onChange={handleChange} className={inputClassName} />
            </div>

            <div>
              <label htmlFor="registroSanitario">Registro sanitario (opcional)</label>
              <input id="registroSanitario" name="registroSanitario" value={form.registroSanitario} onChange={handleChange} className={inputClassName} />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="observaciones">Observaciones (opcional)</label>
              <textarea id="observaciones" name="observaciones" value={form.observaciones} onChange={handleChange} className={inputClassName} rows={5} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#e5ebf5] bg-white px-6 py-4">
        <p className="text-xs text-[#7a8cae]">{FORM_TABS.find((tab) => tab.key === activeTab)?.description}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="fe-btn-muted">Cancelar</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || (!isCreate && !hasPendingChanges)}
            className="fe-btn-primary"
            title={!isCreate && !hasPendingChanges ? 'No hay cambios por guardar.' : undefined}
          >
            {isSaving ? 'Guardando...' : submitLabel}
          </button>
        </div>
      </div>
    </section>
  )
}

export default MedicineWorkspaceForm

<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { ANOMALY_CLASSES, NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { AnomalyClass } from '../../types'

/** Formulas read the same in every language; `no-data` has words instead, from the messages. */
const CLASS_RULES: Record<Exclude<AnomalyClass, 'no-data'>, string> = {
  'very-low': 'Q < p10',
  low: 'p10 ≤ Q < p25',
  normal: 'p25 ≤ Q ≤ p75',
  high: 'p75 < Q ≤ p90',
  'very-high': 'Q > p90',
}

const { locale, t } = useLocale()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
let opener: HTMLElement | null = null

function open() {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

/** Esc and the close button both end here; focus goes back to whatever opened the dialog. */
function onClose() {
  opener?.focus()
  opener = null
}

/** A click whose target is the dialog itself landed on the backdrop, outside the content box. */
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="about-heading"
    class="m-auto max-h-[90dvh] w-[min(42rem,calc(100%-2rem))] rounded-lg bg-white p-0 text-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-xl backdrop:bg-slate-900/50 dark:backdrop:bg-black/60"
    @close="onClose"
    @click="onClick"
  >
    <div class="space-y-4 p-5 text-sm leading-relaxed">
      <div class="flex items-start justify-between gap-4">
        <h2 id="about-heading" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {{ t.about.heading }}
        </h2>
        <button
          type="button"
          :aria-label="t.about.close"
          class="-m-1 rounded p-1 text-xl leading-none text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
          @click="close"
        >
          ×
        </button>
      </div>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          {{ t.about.sourceHeading }}
        </h3>
        <!-- Prose with inline markup stays in the template, one block per language. -->
        <template v-if="locale === 'uk'">
          <p>
            Витрати води — гідрологічна модель <strong>GloFAS v4</strong> (Copernicus Emergency
            Management Service) через
            <a
              class="text-sky-800 dark:text-sky-300 underline"
              href="https://open-meteo.com/en/docs/flood-api"
            >
              Open-Meteo Flood API</a
            >. Сітка ~5 км; для кожної станції береться найбільша річка в комірці. Норма рахується
            за реаналізом GloFAS (1984 – липень 2022). Останні тижні й прогноз — оперативні прогнози
            GloFAS: архівні для минулих днів і ансамблевий прогноз до 7 місяців наперед.
          </p>
          <p>
            Це <strong>модельні</strong> дані, а не вимірювання на гідрологічних постах. Вони можуть
            відрізнятися від офіційних даних спостережень.
          </p>
        </template>
        <template v-else>
          <p>
            Discharge comes from the <strong>GloFAS v4</strong> hydrological model (Copernicus
            Emergency Management Service) via the
            <a
              class="text-sky-800 dark:text-sky-300 underline"
              href="https://open-meteo.com/en/docs/flood-api"
            >
              Open-Meteo Flood API</a
            >. The grid is ~5 km; each station takes the largest river in its cell. The norm is
            computed from the GloFAS reanalysis (1984 – July 2022). The last weeks and the forecast
            are GloFAS operational forecasts: archived ones for past days and an ensemble forecast
            up to 7 months ahead.
          </p>
          <p>
            These are <strong>modelled</strong> data, not measurements at gauging stations. They may
            differ from official observations.
          </p>
        </template>
      </section>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          {{ t.about.normHeading }}
        </h3>
        <p v-if="locale === 'uk'">
          Норма — кліматичний період ВМО <strong>1991–2020</strong>. Для кожного дня року беруться
          модельні витрати за всі 30 років у вікні ±3 дні (≈210 значень) і рахуються медіана та
          перцентилі p10, p25, p75, p90. 29 лютого прирівнюється до 28 лютого.
        </p>
        <p v-else>
          The norm is the WMO climate period <strong>1991–2020</strong>. For each day of the year,
          modelled discharge from all 30 years within a ±3-day window (≈210 values) gives the median
          and the percentiles p10, p25, p75, p90. 29 February counts as 28 February.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          {{ t.about.stateHeading }}
        </h3>
        <p v-if="locale === 'uk'">
          Q — витрата води за сьогодні (за київським часом), порівнюється з нормою того самого дня
          року. Відхилення — Q відносно медіани норми, у відсотках.
        </p>
        <p v-else>
          Q is today’s discharge (Kyiv time), compared with the norm for the same day of the year.
          Deviation is Q relative to the median norm, in percent.
        </p>
        <table class="w-full border-collapse text-left">
          <thead>
            <tr
              class="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400"
            >
              <th scope="col" class="py-1 pr-3 font-medium">{{ t.about.stateColumn }}</th>
              <th scope="col" class="py-1 font-medium">{{ t.about.ruleColumn }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in ANOMALY_CLASSES"
              :key="c.id"
              class="border-b border-slate-100 dark:border-slate-800"
            >
              <td class="py-1 pr-3">
                <span class="flex items-center gap-1.5">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :style="
                      c.color ? { background: c.color } : { border: `2px solid ${NO_DATA_STROKE}` }
                    "
                  ></span>
                  {{ t.anomalyClasses[c.id] }}
                </span>
              </td>
              <td class="py-1 font-mono text-xs">
                {{ c.id === 'no-data' ? t.about.noDataRule : CLASS_RULES[c.id] }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          {{ t.about.limitsHeading }}
        </h3>
        <ul class="list-disc space-y-1 pl-5">
          <li v-for="limit in t.about.limits" :key="limit">{{ limit }}</li>
        </ul>
      </section>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { ANOMALY_CLASSES, NO_DATA_STROKE } from '../../config/anomalyClasses'

const CLASS_RULES: Record<string, string> = {
  'very-low': 'Q < p10',
  low: 'p10 ≤ Q < p25',
  normal: 'p25 ≤ Q ≤ p75',
  high: 'p75 < Q ≤ p90',
  'very-high': 'Q > p90',
  'no-data': 'значення на сьогодні немає',
}

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
    class="m-auto max-h-[90dvh] w-[min(42rem,calc(100%-2rem))] rounded-lg p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/50"
    @close="onClose"
    @click="onClick"
  >
    <div class="space-y-4 p-5 text-sm leading-relaxed">
      <div class="flex items-start justify-between gap-4">
        <h2 id="about-heading" class="text-lg font-semibold text-slate-900">Про дані</h2>
        <button
          type="button"
          aria-label="Закрити"
          class="-m-1 rounded p-1 text-xl leading-none text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700"
          @click="close"
        >
          ×
        </button>
      </div>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900">Звідки дані</h3>
        <p>
          Витрати води — гідрологічна модель <strong>GloFAS v4</strong> (Copernicus Emergency
          Management Service) через
          <a class="text-sky-800 underline" href="https://open-meteo.com/en/docs/flood-api">
            Open-Meteo Flood API</a
          >. Сітка ~5 км; для кожної станції береться найбільша річка в комірці. Норма рахується за
          реаналізом GloFAS (1984 – липень 2022). Останні тижні й прогноз — оперативні прогнози
          GloFAS: архівні для минулих днів і ансамблевий прогноз до 7 місяців наперед.
        </p>
        <p>
          Це <strong>модельні</strong> дані, а не вимірювання на гідрологічних постах. Вони можуть
          відрізнятися від офіційних даних спостережень.
        </p>
      </section>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900">Як рахується норма</h3>
        <p>
          Норма — кліматичний період ВМО <strong>1991–2020</strong>. Для кожного дня року беруться
          модельні витрати за всі 30 років у вікні ±3 дні (≈210 значень) і рахуються медіана та
          перцентилі p10, p25, p75, p90. 29 лютого прирівнюється до 28 лютого.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="font-semibold text-slate-900">Як визначається стан</h3>
        <p>
          Q — витрата води за сьогодні (за київським часом), порівнюється з нормою того самого дня
          року. Відхилення — Q відносно медіани норми, у відсотках.
        </p>
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-200 text-xs text-slate-600">
              <th scope="col" class="py-1 pr-3 font-medium">Стан</th>
              <th scope="col" class="py-1 font-medium">Умова</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in ANOMALY_CLASSES" :key="c.id" class="border-b border-slate-100">
              <td class="py-1 pr-3">
                <span class="flex items-center gap-1.5">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :style="
                      c.color ? { background: c.color } : { border: `2px solid ${NO_DATA_STROKE}` }
                    "
                  ></span>
                  {{ c.label }}
                </span>
              </td>
              <td class="py-1 font-mono text-xs">{{ CLASS_RULES[c.id] }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="space-y-1">
        <h3 class="font-semibold text-slate-900">Обмеження</h3>
        <ul class="list-disc space-y-1 pl-5">
          <li>Маркер на карті стоїть на річці, а дані відповідають центру комірки GloFAS.</li>
          <li>
            Поточні значення беруться з оперативного прогнозу, а норма — з реаналізу, тож порівняння
            з нормою наближене.
          </li>
        </ul>
      </section>
    </div>
  </dialog>
</template>

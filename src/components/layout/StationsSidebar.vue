<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'
import StationsPanel from '../panel/StationsPanel.vue'

const props = defineProps<{
  states: readonly StationState[]
  /** A drawer over the page on narrow screens; a docked column on wide ones. */
  modal: boolean
  pending: boolean
  dischargeErrorMessage: string | null
  normsError: boolean
}>()
defineEmits<{ retry: [] }>()

const ui = useUiStore()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

// The native modal dialog gives the drawer focus trapping, Esc and an inert page for free.
watch(
  [() => ui.sidebarOpen, dialog],
  ([open, el]) => {
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  },
  { flush: 'post', immediate: true },
)

// Picking a station in the drawer reveals it on the map behind.
watch(
  () => ui.selectedId,
  () => {
    if (props.modal) ui.sidebarOpen = false
  },
)

/** A click whose target is the dialog itself landed on the backdrop. */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) ui.sidebarOpen = false
}
</script>

<template>
  <dialog
    v-if="modal"
    id="stations-sidebar"
    ref="dialog"
    aria-labelledby="stations-heading"
    class="drawer m-0 h-dvh max-h-none w-[min(26rem,calc(100%-3rem))] max-w-none overflow-y-auto bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
    @close="ui.sidebarOpen = false"
    @click="onDialogClick"
  >
    <StationsPanel
      :states="states"
      :pending="pending"
      :discharge-error-message="dischargeErrorMessage"
      :norms-error="normsError"
      close-label="Закрити список станцій"
      @retry="$emit('retry')"
      @close="ui.sidebarOpen = false"
    />
  </dialog>
  <aside
    v-else
    v-show="ui.sidebarOpen"
    id="stations-sidebar"
    aria-labelledby="stations-heading"
    class="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white xl:w-[22rem] 2xl:w-[26rem]"
  >
    <StationsPanel
      :states="states"
      :pending="pending"
      :discharge-error-message="dischargeErrorMessage"
      :norms-error="normsError"
      close-label="Сховати список станцій"
      @retry="$emit('retry')"
      @close="ui.sidebarOpen = false"
    />
  </aside>
</template>

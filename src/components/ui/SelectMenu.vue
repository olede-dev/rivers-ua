<script setup lang="ts" generic="T extends string | number">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

/** Select-only combobox (WAI-ARIA APG pattern) styled like the rest of the UI. */
const props = defineProps<{
  /** id of the visible label element. */
  labelledby: string
  options: readonly { value: T; label: string }[]
}>()
const model = defineModel<T>({ required: true })

const id = useId()
const listboxId = `${id}-listbox`
const optionId = (index: number) => `${id}-option-${index}`

const root = ref<HTMLElement | null>(null)
const listbox = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(0)

const selectedIndex = computed(() => props.options.findIndex((o) => o.value === model.value))
const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? '')

function show() {
  activeIndex.value = Math.max(selectedIndex.value, 0)
  open.value = true
}

function hide() {
  open.value = false
}

function choose(index: number) {
  const option = props.options[index]
  if (option) model.value = option.value
  hide()
}

function move(index: number) {
  activeIndex.value = Math.min(Math.max(index, 0), props.options.length - 1)
  nextTick(() => {
    listbox.value
      ?.querySelector(`#${CSS.escape(optionId(activeIndex.value))}`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      show()
    }
    return
  }
  switch (event.key) {
    case 'ArrowDown':
      move(activeIndex.value + 1)
      break
    case 'ArrowUp':
      move(activeIndex.value - 1)
      break
    case 'Home':
      move(0)
      break
    case 'End':
      move(props.options.length - 1)
      break
    case 'Enter':
    case ' ':
      choose(activeIndex.value)
      break
    case 'Escape':
      hide()
      break
    case 'Tab':
      choose(activeIndex.value)
      return
    default:
      return
  }
  event.preventDefault()
}

function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) hide()
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onPointerDown)
  else document.removeEventListener('pointerdown', onPointerDown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-labelledby="labelledby"
      :aria-activedescendant="open ? optionId(activeIndex) : undefined"
      class="inline-flex h-8 w-full items-center justify-between gap-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pr-2 pl-2.5 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      @click="open ? hide() : show()"
      @keydown="onKeydown"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <svg
        class="size-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>

    <ul
      v-show="open"
      :id="listboxId"
      ref="listbox"
      role="listbox"
      :aria-labelledby="labelledby"
      tabindex="-1"
      class="absolute top-full left-0 z-20 mt-1 max-h-64 min-w-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-lg"
    >
      <li
        v-for="(option, index) in options"
        :id="optionId(index)"
        :key="option.value"
        role="option"
        :aria-selected="index === selectedIndex"
        class="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 whitespace-nowrap text-slate-800 dark:text-slate-200"
        :class="{
          'bg-slate-100 dark:bg-slate-800': index === activeIndex,
          'font-medium text-sky-800 dark:text-sky-300': index === selectedIndex,
        }"
        @pointerenter="activeIndex = index"
        @click="choose(index)"
      >
        {{ option.label }}
        <svg
          v-if="index === selectedIndex"
          class="size-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m3.5 8.5 3 3 6-7" />
        </svg>
      </li>
    </ul>
  </div>
</template>

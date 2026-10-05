import type { LowFlowClass, MapLayer, TrendClass } from '../config/climateClasses'
import type { AnomalyClass, BasinId } from '../types'

/** Ukrainian UI copy; the source of truth for the `Messages` shape every locale fills. */
export const uk = {
  /** Value of the `lang` attribute and the BCP 47 tag for `Intl`. */
  htmlLang: 'uk',
  documentTitle: 'Річки України — стан і прогноз стоку',
  documentDescription:
    'Стан водності великих річок України відносно норми 1997–2020 і ансамблевий прогноз стоку GloFAS.',

  header: {
    title: 'Річки України',
    titleSuffix: ' — стан і прогноз стоку',
    subtitleShort: 'Стан і прогноз стоку',
    subtitleLong: 'Модельні витрати води GloFAS, норма 1997–2020',
    stations: 'Станції',
    showStations: 'Показати список станцій',
    hideStations: 'Сховати список станцій',
  },
  theme: {
    label: 'Тема',
    menuLabel: 'Тема оформлення',
    auto: 'Авто',
    light: 'Світла',
    dark: 'Темна',
  },
  language: {
    label: 'Мова',
    menuLabel: 'Мова інтерфейсу',
  },
  footer: {
    dataSource: 'Дані: GloFAS (Copernicus Emergency Management Service) via',
    modelled: 'Модельні дані.',
    map: 'Мапа:',
    relief: 'рельєф',
    about: 'Про дані та методику',
  },
  about: {
    heading: 'Про дані',
    close: 'Закрити',
    sourceHeading: 'Звідки дані',
    normHeading: 'Як рахується норма',
    stateHeading: 'Як визначається стан',
    stateColumn: 'Стан',
    ruleColumn: 'Умова',
    noDataRule: 'значення на сьогодні немає',
    limitsHeading: 'Обмеження',
    limits: [
      'Маркер на карті стоїть на річці, а дані відповідають центру комірки GloFAS.',
      'Поточні значення беруться з оперативного прогнозу, а норма — з реаналізу, тож порівняння з нормою наближене.',
      'Опади — у точці станції (модель Open-Meteo), а не середні по водозбору; прогноз опадів — лише на 16 днів.',
    ],
  },
  home: {
    map: 'Карта',
    station: 'Станція',
    loadingStation: 'Завантаження станції…',
    pickStation: 'Оберіть станцію на карті',
    stationList: 'Список станцій',
  },
  errors: {
    retry: 'Спробувати ще',
    rateLimited: 'Ліміт запитів до Open-Meteo вичерпано. Спробуйте пізніше.',
    loadFailed: 'Не вдалося завантажити дані Open-Meteo.',
    snapshotRateLimited: 'ліміт запитів до Open-Meteo вичерпано',
    snapshotUnavailable: 'Open-Meteo недоступний',
    snapshotNotice: (cause: string, date: string) =>
      `Зараз ${cause} — показано збережені дані від ${date}`,
  },
  panel: {
    heading: 'Станції',
    closeStations: 'Закрити список станцій',
    normsFailed: 'Норми не завантажилися — відхилення і стан водності недоступні.',
    loading: 'Завантаження даних…',
    basin: 'Басейн',
    allBasins: 'Усі',
    sortBy: 'Сортувати за',
    sort: { pct: '% від норми', current: 'витратою', class: 'станом', name: 'назвою' },
    ascending: 'За зростанням',
    descending: 'За спаданням',
    listLabel: 'Станції та стан водності на сьогодні',
    unknownState: 'Стан невідомий',
    focusBasin: 'фокусний басейн',
  },
  details: {
    close: 'Закрити станцію',
    basin: (name: string) => `Басейн: ${name}`,
    cell: (coordinates: string) => `Комірка GloFAS: ${coordinates}`,
    now: 'Зараз',
    normToday: 'Норма на сьогодні',
    deviation: 'Відхилення',
    outlook: {
      high: 'Прогноз: можливе підвищення водності',
      low: 'Прогноз: можливе маловоддя',
      highDetail: (date: string) => `медіана прогнозу вище p90 норми з ${date}`,
      lowDetail: (date: string) => `медіана прогнозу нижче p10 норми з ${date}`,
    },
    exportCsv: 'Експорт у CSV',
    chartHeading: 'Витрати і прогноз GloFAS',
    normsMissing: 'Норми не завантажилися — графік показано в м³/с.',
    loadingChart: 'Завантаження графіка…',
    noChartData: 'Немає даних для графіка',
    precipitationNote: 'Опади в точці станції (не по водозбору), прогноз — на 16 днів.',
    precipitationFailed: 'Опади не завантажилися.',
    precipitationRateLimited: 'Опади недоступні: ліміт запитів до Open-Meteo вичерпано.',
    chartNote:
      'Прогноз — ансамбль GloFAS: медіана, міжквартильний діапазон (p25–p75) і повний розкид (min–max). Норма — 1997–2020 для того самого дня року.',
  },
  chart: {
    rangeLabel: 'Горизонт прогнозу',
    ranges: { 30: '30 днів', 90: '3 місяці', 210: '7 місяців' },
    modeLabel: 'Одиниці графіка',
    precipitationToggle: 'Опади',
    pctOfNorm: '% від норми',
    normBand: 'Норма p25–p75',
    forecastSpread: 'Прогноз min–max',
    forecastIqr: 'Прогноз p25–p75',
    normRelative: 'Норма (100%)',
    normMedian: 'Норма (медіана)',
    forecastMedian: 'Прогноз (медіана ансамблю)',
    past: 'Минулі значення (модель)',
    dischargeAxis: 'Витрата води, м³/с',
    precipitation: 'Опади',
    precipitationAxis: 'Опади, мм',
    precipitationUnit: 'мм',
    today: 'Сьогодні',
    ariaLabel: 'Графік витрат води: минулі значення, прогноз ансамблю і норма',
  },
  map: {
    ariaLabel: 'Карта станцій: колір маркера — стан водності',
    legendTitle: 'Водність відносно норми',
    timeline: {
      label: 'Дата на карті',
      play: 'Відтворити таймлапс',
      pause: 'Призупинити таймлапс',
      today: 'Сьогодні',
      todayLabel: 'Повернутися до сьогодні',
      forecast: 'прогноз',
      past: 'спостереження',
    },
  },
  climate: {
    layerLabel: 'Що показує карта',
    layers: { state: 'Стан', trend: 'Тренд', lowFlow: 'Маловоддя' } satisfies Record<
      MapLayer,
      string
    >,
    trendLegend: 'Зміна середнього стоку',
    trendNote: (recent: string, baseline: string) => `${recent} проти ${baseline}`,
    trendTooltip: (pct: string) => `тренд стоку ${pct}`,
    trendClasses: {
      'strong-decrease': 'Сильне зменшення (понад −30%)',
      decrease: 'Зменшення (−10…−30%)',
      stable: 'Без суттєвих змін (±10%)',
      increase: 'Зростання (+10…+30%)',
      'strong-increase': 'Сильне зростання (понад +30%)',
    } satisfies Record<TrendClass, string>,
    lowFlowLegend: 'Днів маловоддя з 1 січня',
    lowFlowNote: 'День маловоддя — витрата нижче p10 норми',
    lowFlowClasses: {
      none: 'Жодного',
      few: '1–14 днів',
      some: '15–44 дні',
      many: '45–89 днів',
      extreme: '90 днів і більше',
    } satisfies Record<LowFlowClass, string>,
    days: (n: number) => {
      const mod10 = n % 10
      const mod100 = n % 100
      const word =
        mod10 === 1 && mod100 !== 11
          ? 'день'
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
            ? 'дні'
            : 'днів'
      return `${n} ${word}`
    },
    heading: 'Клімат: як змінюється річка',
    meanChange: 'Середній стік',
    lowSeasonChange: 'Стік у межень (липень–жовтень)',
    periods: (recent: string, baseline: string) =>
      `Зміна середнього за ${recent} проти ${baseline}.`,
    thisYear: 'Днів маловоддя цього року',
    baselineMean: (period: string) => `У середньому за ${period}`,
    chartHeading: (date: string) => `Днів маловоддя з 1 січня по ${date}, за роками`,
    chartAria: 'Стовпчики: кількість днів маловоддя за однаковий період кожного року',
    chartNote:
      'День маловоддя — день, коли витрата нижча за p10 норми 1997–2020 для цього дня року.',
    loading: 'Завантаження кліматичних даних…',
    failed: 'Кліматичні дані не завантажилися.',
    thisYearFailed: 'Дані цього року не завантажилися — показано лише минулі роки.',
  },
  /** m³/s; also the chart's absolute mode label. */
  dischargeUnit: 'м³/с',
  basins: {
    dnipro: 'Дніпро',
    dnister: 'Дністер',
    danube: 'Дунай',
    'pivdennyi-buh': 'Південний Буг',
    don: 'Дон',
  } satisfies Record<BasinId, string>,
  anomalyClasses: {
    'very-low': 'Дуже низька водність',
    low: 'Низька водність',
    normal: 'Близько до норми',
    high: 'Підвищена водність',
    'very-high': 'Висока водність',
    'no-data': 'Немає даних',
  } satisfies Record<AnomalyClass, string>,
}

export type Messages = typeof uk

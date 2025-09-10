export const strings = {
  appTitle: 'Bewertungsbaukasten',
  toolbar: {
    save: 'Speichern (Browser)',
    load: 'Laden',
    exportJson: 'Konfig als JSON exportieren',
    importJson: 'JSON importieren',
    exportPdf: 'Export PDF',
    exportDocx: 'Export DOCX',
    exportXlsx: 'Export XLSX',
    exportOdp: 'Export ODP'
  },
  keyboard: {
    save: 'Alt+S: Speichern',
    export: 'Alt+E: Export-Menü'
  },
  columns: {
    categories: 'Kategorien',
    selected: 'Ausgewählt',
    scales: 'Skalen'
  },
  labels: {
    add: 'Hinzufügen',
    remove: 'Entfernen',
    reorder: 'Verschieben',
    scale: 'Skala',
    defaultScale: 'Standard-Skala'
  },
  a11y: {
    status: 'Statusmeldungen',
    accordionToggle: 'Abschnitt umschalten',
    dragHint: 'Mit Pfeiltasten verschieben; Entfernen-Taste entfernt.'
  },
  messages: {
    loadedYaml: 'YAML geladen.',
    yamlError: 'Fehler beim Laden/Validieren von YAML. Fallback aktiviert.',
    saved: 'Konfiguration gespeichert.',
    loaded: 'Konfiguration geladen.',
    imported: 'JSON importiert.',
    exported: 'Export gestartet...',
    removed: 'Kriterium entfernt.'
  }
} as const;


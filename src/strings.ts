export const strings = {
  appTitle: 'Bewertungsbaukasten',
  toolbar: {
    save: 'Speichern (Browser)',
    load: 'Laden',
    exportJson: 'Konfig exportieren',
    importJson: 'JSON importieren',
    exportPdf: 'Export PDF',
    exportDocx: 'Export DOCX',
    exportXlsx: 'Export XLSX',
    exportOdp: 'Export ODP',
    exportNow: 'Exportieren',
    exportFormat: 'Format',
    togglePreview: 'Vorschau'
  },
  keyboard: {
    save: 'Alt+S: Speichern',
    export: 'Alt+E: Export'
  },
  columns: {
    categories: 'Kategorien',
    selected: 'Ausgewählt',
    scales: 'Skalen'
  },
  kopfdaten: {
    title: 'Kopfdaten',
    learner: 'Lernende/r',
    topic: 'Thema',
    date: 'Datum',
    feedback: 'Feedback / Anmerkungen'
  },
  labels: {
    add: 'Hinzufügen',
    remove: 'Entfernen',
    reorder: 'Verschieben',
    scale: 'Skala',
    defaultScale: 'Standard-Skala',
    weight: 'Gewicht',
    addCustomItem: 'Eigenes Kriterium hinzufügen',
    customItemPlaceholder: 'Kriterium eingeben…',
    preview: 'Vorschau Bewertungsbogen',
    previewEmpty: 'Noch keine Kriterien ausgewählt.',
    previewColCategory: 'Kategorie',
    previewColItem: 'Kriterium',
    previewColDesc: 'Beschreibung',
    previewColWeight: 'Gew.',
    previewColScale: 'Skala',
    previewColEval: 'Bewertung'
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
    removed: 'Kriterium entfernt.',
    customItemAdded: 'Eigenes Kriterium hinzugefügt.',
    customItemRemoved: 'Eigenes Kriterium entfernt.'
  }
} as const;

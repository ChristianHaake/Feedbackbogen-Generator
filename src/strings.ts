export const strings = {
  appTitle: 'Bewertungsbaukasten',
  toolbar: {
    save: 'Speichern',
    load: 'Laden',
    exportJson: 'Konfig exportieren',
    importJson: 'JSON importieren',
    exportNow: 'Exportieren',
    exportFormat: 'Format'
  },
  keyboard: {
    save: 'Alt+S: Speichern',
    export: 'Alt+E: Export'
  },
  columns: {
    categories: 'Kategorien',
    selected: 'Ausgewählte Kriterien',
    scales: 'Skalen'
  },
  kopfdaten: {
    title: 'Kopfdaten',
    learner: 'Lernende/r',
    topic: 'Thema',
    date: 'Datum',
    feedback: 'Feedback / Anmerkungen'
  },
  modes: {
    full: 'Bewertungsbogen',
    checklist: 'Checkliste'
  },
  labels: {
    add: 'Hinzufügen',
    remove: 'Entfernen',
    reorder: 'Verschieben',
    scale: 'Skala',
    defaultScale: 'Standard-Skala',
    weight: 'Gewicht',
    addCustomItem: 'Eigenes Kriterium hinzufügen',
    customItemPlaceholder: 'Eigenes Kriterium…',
    previewMode: 'Ansicht',
    previewEmpty: 'Noch keine Kriterien ausgewählt — füge links Kriterien hinzu.',
    selectedEmpty: 'Noch nichts ausgewählt.'
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

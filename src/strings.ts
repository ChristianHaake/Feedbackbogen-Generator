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
    categories: 'Kategorien & Kriterien'
  },
  kopfdaten: {
    title: 'Kopfdaten (optional vorausfüllen)',
    learner: 'Name',
    learngroup: 'Lerngruppe',
    topic: 'Thema',
    date: 'Datum',
    feedback: 'Feedback / Anmerkungen'
  },
  modes: {
    full: 'Bewertungsbogen',
    checklist: 'Checkliste'
  },
  labels: {
    remove: 'Entfernen',
    scale: 'Skala',
    defaultScale: 'Standard-Skala',
    addCustomItem: 'Eigenes Kriterium hinzufügen',
    customItemPlaceholder: 'Eigenes Kriterium…',
    previewMode: 'Ansicht',
    previewEmpty: 'Noch keine Kriterien ausgewählt — links auswählen.',
    selectedCount: (n: number) => `${n} ${n === 1 ? 'Kriterium' : 'Kriterien'} ausgewählt`
  },
  a11y: {
    status: 'Statusmeldungen',
    accordionToggle: 'Abschnitt umschalten'
  },
  messages: {
    loadedYaml: 'YAML geladen.',
    yamlError: 'Fehler beim Laden/Validieren von YAML. Fallback aktiviert.',
    saved: 'Konfiguration gespeichert.',
    loaded: 'Konfiguration geladen.',
    imported: 'JSON importiert.',
    exported: 'Export gestartet...',
    customItemAdded: 'Eigenes Kriterium hinzugefügt.',
    customItemRemoved: 'Eigenes Kriterium entfernt.'
  }
} as const;

export type Item = {
  id: string;
  label: string;
  description?: string;
};

export type Category = {
  id: string;
  title: string;
  description?: string;
  items?: Item[];
  groups?: {
    id: string;
    title: string;
    items: Item[];
  }[];
};

export type ScaleBase = {
  id: string;
  label: string;
  kind: 'verbal' | 'numeric' | 'symbol' | 'traffic' | 'percent';
};

export type VerbalScale = ScaleBase & { kind: 'verbal'; labels: string[] };
export type NumericScale = ScaleBase & {
  kind: 'numeric';
  defaultMin: number;
  defaultMax: number;
  minLimit: number;
  maxLimit: number;
  maxSteps: number;
  min?: number;
  max?: number;
};
export type SymbolScale = ScaleBase & { kind: 'symbol'; set: string[] };
export type TrafficScale = ScaleBase & { kind: 'traffic'; colors: string[] };
export type PercentScale = ScaleBase & { kind: 'percent' };

export type Scale = VerbalScale | NumericScale | SymbolScale | TrafficScale | PercentScale;

export type ProductFormatCriterion = {
  id: string;
  label: string;
  description?: string;
};

export type ProductFormat = {
  id: string;
  title: string;
  criteria: ProductFormatCriterion[];
};

export type ProductFormatGroup = {
  id: string;
  title: string;
  formats: ProductFormat[];
};

export type ProductFormatData = {
  groups: ProductFormatGroup[];
};

export type SelectedItemRef = {
  categoryId: string;
  itemId: string;
};

export type NumericScaleSettings = {
  min: number;
  max: number;
};

export type CustomItem = Item & {
  custom: true;
  categoryId: string;
};

export type HeaderField = {
  id: string;
  label: string;
  value: string;
};

export type HeaderData = {
  fields: HeaderField[];
};

export type DocumentTitleMode = 'bewertungsbogen' | 'feedbackbogen' | 'custom';

export type DocumentTitleConfig = {
  mode: DocumentTitleMode;
  custom: string;
};

export type FooterFieldId = 'date' | 'signature' | 'grade';
export type FooterFields = Record<FooterFieldId, boolean>;

export type AppConfig = {
  schemaVersion: number;
  selectedItems: SelectedItemRef[];
  selectedProductFormats: string[];
  scaleByCategory: Record<string, string>;
  scaleSettingsByCategory: Record<string, NumericScaleSettings>;
  defaultScaleId?: string;
  documentTitle: DocumentTitleConfig;
  header: HeaderData;
  footerFields: FooterFields;
  customItems: CustomItem[];
  categoryOrder: string[];
  itemOrderByCategory: Record<string, string[]>;
};

export type ExportRow = {
  categoryId: string;
  category: string;
  item: string;
  scale: Scale | null;
};

export type PrintMode = 'full' | 'checklist';

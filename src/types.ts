export type Item = {
  id: string;
  label: string;
  description?: string;
};

export type Category = {
  id: string;
  title: string;
  items: Item[];
};

export type ScaleBase = {
  id: string;
  kind: 'verbal' | 'numeric' | 'emoji' | 'traffic' | 'percent';
};

export type VerbalScale = ScaleBase & {
  kind: 'verbal';
  labels: string[]; // 4–5 Stufen
};

export type NumericScale = ScaleBase & {
  kind: 'numeric';
  min: number;
  max: number;
};

export type EmojiScale = ScaleBase & {
  kind: 'emoji';
  set: string[]; // emojis
};

export type TrafficScale = ScaleBase & {
  kind: 'traffic';
  colors: string[]; // green, yellow, red
};

export type PercentScale = ScaleBase & {
  kind: 'percent';
};

export type Scale = VerbalScale | NumericScale | EmojiScale | TrafficScale | PercentScale;

export type YAMLData = {
  version: 1;
  categories: Category[];
  scales: Scale[];
};

export type SelectedItemRef = {
  categoryId: string;
  itemId: string;
};

export type AppConfigV1 = {
  version: 1;
  selectedItems: SelectedItemRef[];
  scaleByItem: Record<string, string>; // itemId -> scaleId
  defaultScaleId?: string;
};

export type ExportRow = {
  category: string;
  item: string;
  description?: string;
  scaleLabel: string;
};


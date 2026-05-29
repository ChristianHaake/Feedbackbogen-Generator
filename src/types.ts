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
  kind: 'verbal' | 'numeric' | 'emoji' | 'traffic' | 'percent';
};

export type VerbalScale = ScaleBase & { kind: 'verbal'; labels: string[] };
export type NumericScale = ScaleBase & { kind: 'numeric'; min: number; max: number };
export type EmojiScale = ScaleBase & { kind: 'emoji'; set: string[] };
export type TrafficScale = ScaleBase & { kind: 'traffic'; colors: string[] };
export type PercentScale = ScaleBase & { kind: 'percent' };

export type Scale = VerbalScale | NumericScale | EmojiScale | TrafficScale | PercentScale;

export type YAMLData = {
  categories: Category[];
  scales: Scale[];
};

export type SelectedItemRef = {
  categoryId: string;
  itemId: string;
};

export type CustomItem = Item & {
  custom: true;
  categoryId: string;
};

export type HeaderData = {
  learner: string;
  learngroup: string;
  topic: string;
  date: string;
  feedback: string;
};

export type AppConfig = {
  selectedItems: SelectedItemRef[];
  scaleByCategory: Record<string, string>;
  defaultScaleId?: string;
  header: HeaderData;
  customItems: CustomItem[];
};

export type ExportRow = {
  categoryId: string;
  category: string;
  item: string;
  scale: Scale | null;
};

export type PrintMode = 'full' | 'checklist';

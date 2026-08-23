export type DiffType = 'komisyon-hatasi' | 'desi-farki' | 'iade-duzeltmesi';

export interface DisputeOrder {
  id: string;
  productName: string;
  orderNumber: string;
  diffType: DiffType;
  diffAmount: number;
}

export const diffTypeLabels: Record<DiffType, string> = {
  'komisyon-hatasi': 'Komisyon hatası',
  'desi-farki': 'Desi farkı',
  'iade-duzeltmesi': 'İade düzeltmesi',
};

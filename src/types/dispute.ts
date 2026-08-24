export type DiffType = 'komisyon' | 'desi' | 'iade' | 'diger';

export interface DisputeOrder {
  id: string;
  productName: string;
  orderNumber: string;
  diffType: DiffType;
  diffAmount: number;
}

export const diffTypeLabels: Record<DiffType, string> = {
  komisyon: 'Komisyon hatası',
  desi: 'Desi farkı',
  iade: 'İade düzeltmesi',
  diger: 'Diğer',
};

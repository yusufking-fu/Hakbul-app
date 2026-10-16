export type DiffType = 'komisyon' | 'desi' | 'iade' | 'mukerrer' | 'ceza' | 'diger';

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
  mukerrer: 'Mükerrer kesinti',
  ceza: 'Ceza/Operasyonel',
  diger: 'Diğer',
};

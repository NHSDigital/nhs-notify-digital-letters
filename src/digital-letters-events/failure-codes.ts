export const FAILURE_CODE_DEFINITIONS = {
  DL_PDMV_001: 'Letter rejected by PDM',
  DL_PDMV_002: 'Timeout waiting for letter storage',
  DL_CLIV_003: 'Attachment contains a virus',
  DL_INTE_001: 'Request rejected by Core API',
} as const;

export const DL_PDMV_001 = 'DL_PDMV_001' as const;
export const DL_PDMV_002 = 'DL_PDMV_002' as const;
export const DL_CLIV_003 = 'DL_CLIV_003' as const;
export const DL_INTE_001 = 'DL_INTE_001' as const;

export type FailureCode =
  | typeof DL_PDMV_001
  | typeof DL_PDMV_002
  | typeof DL_CLIV_003
  | typeof DL_INTE_001
  | string;

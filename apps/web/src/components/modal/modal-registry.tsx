export type ModalComponent<T = any> = React.ComponentType<{
  props?: T;
  close: () => void;
  onSubmit?: (data?: any) => void;
  onCancel?: () => void;
}>;

interface IModalRegistry {
  [key: string]: () => Promise<{ default: ModalComponent }>;
}

export const MODALS = {
  INFO: 'info',
  ACTION: 'action',
  PAYMENT_METHOD_ADD: 'payment_method_add',
  PAYMENT_METHOD_DELETE: 'payment_method_delete',
  MAP_LOCATION_PICK: 'map_location_pick',
};

export const modalRegistry: IModalRegistry = {
  [MODALS.INFO]: () => import('./info-modal'),
  [MODALS.ACTION]: () => import('./action-modal'),
  [MODALS.PAYMENT_METHOD_ADD]: () => import('./payment-method-add-modal'),
  [MODALS.PAYMENT_METHOD_DELETE]: () => import('./payment-method-delete-modal'),
  [MODALS.MAP_LOCATION_PICK]: () => import('./map-location-pick-modal'),
};

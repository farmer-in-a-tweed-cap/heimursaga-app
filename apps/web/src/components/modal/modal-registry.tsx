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
  MAP_LOCATION_SELECT: 'map_location_select',
  TRIP_SELECT: 'trip_select',
  SPONSOR_CHECKOUT: 'sponsor_checkout',
  ADMIN_ENTRY_PREVIEW: 'admin_entry_preview',
  ADMIN_USER_PREVIEW: 'admin_user_preview',
  ADMIN_FLAG_DETAILS: 'admin_flag_details',
  DRAFT_RECOVERY: 'draft_recovery',
  DELETE_CONFIRMATION: 'delete_confirmation',
  FLAG_CONTENT: 'flag_content',
};

export const modalRegistry: IModalRegistry = {
  [MODALS.INFO]: () => import('./info-modal'),
  [MODALS.ACTION]: () => import('./action-modal'),
  [MODALS.PAYMENT_METHOD_ADD]: () => import('./payment-method-add-modal'),
  [MODALS.PAYMENT_METHOD_DELETE]: () => import('./payment-method-delete-modal'),
  [MODALS.MAP_LOCATION_SELECT]: () => import('./map-location-pick-modal'),
  [MODALS.TRIP_SELECT]: () => import('./trip-select-modal'),
  [MODALS.SPONSOR_CHECKOUT]: () => import('./sponsor-checkout-modal'),
  [MODALS.ADMIN_ENTRY_PREVIEW]: () => import('./admin-entry-preview-modal'),
  [MODALS.ADMIN_USER_PREVIEW]: () => import('./admin-user-preview-modal'),
  [MODALS.ADMIN_FLAG_DETAILS]: () => import('./admin-flag-details-modal'),
  [MODALS.DRAFT_RECOVERY]: () => import('../draft/draft-recovery-modal'),
  [MODALS.DELETE_CONFIRMATION]: () => import('./delete-confirmation-modal'),
  [MODALS.FLAG_CONTENT]: () => import('./flag-content-modal'),
};

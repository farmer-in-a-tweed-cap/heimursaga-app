'use client';

import { Dialog, DialogContent } from '@repo/ui/components';
import {
  ReactNode,
  Suspense,
  createContext,
  lazy,
  useMemo,
  useState,
} from 'react';

export const MODALS = {
  WELCOME: 'welcome',
  PAYMENT_METHOD_ADD: 'payment_method_add',
  PAYMENT_METHOD_DELETE: 'payment_method_delete',
};

// modal context
interface IModalContextState<T = any> {
  id: string | null;
  props?: T;
  onSubmit?: () => void;
  onCancel?: () => void;
}

interface IModalContext {
  context: IModalContextState;
  setContext: (ctx: Partial<IModalContextState>) => void;
  preload: (modalIds: string[]) => Promise<void>;
}

export const ModalContext = createContext<IModalContext>({
  context: { id: null },
  setContext: () => {},
  preload: async () => {},
});

// modal registry
type ModalComponent<T = any> = React.ComponentType<{
  props?: T;
  close: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
}>;

interface IModalRegistry {
  [key: string]: () => Promise<{ default: ModalComponent }>;
}

const modalRegistry: IModalRegistry = {
  [MODALS.WELCOME]: () => import('./welcome-modal'),
  [MODALS.PAYMENT_METHOD_ADD]: () => import('./payment-method-add-modal'),
  [MODALS.PAYMENT_METHOD_DELETE]: () => import('./payment-method-delete-modal'),
};

// modal cache
const preloadedComponents: Record<string, ModalComponent> = {};

const preloadModal = async (id: string) => {
  if (!preloadedComponents[id] && modalRegistry[id]) {
    const module = await modalRegistry[id]();
    preloadedComponents[id] = module.default;
  }
};

export type ModalBaseProps<T = any> = {
  props?: T;
  close: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
};

// modal provider
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<IModalContextState>({
    id: null,
    props: {},
  });
  const [ModalComponent, setModalComponent] = useState<ModalComponent | null>(
    null,
  );

  const setContext = (ctx: Partial<IModalContextState>): void => {
    setState((prev) => ({ ...prev, ...ctx }));

    if (ctx.id && modalRegistry[ctx.id]) {
      if (preloadedComponents[ctx.id]) {
        setModalComponent(() => preloadedComponents[ctx.id as string]);
      } else {
        const LazyComponent = lazy(modalRegistry[ctx.id]);
        setModalComponent(() => LazyComponent);
      }
    } else {
      setModalComponent(null);
    }
  };

  const preload = async (modalIds: string[]) => {
    await Promise.all(
      modalIds.map((id) =>
        preloadModal(id).catch((e) =>
          console.error(`failed to preload modal ${id}:`, e),
        ),
      ),
    );
  };

  // this is how you cache modals using useEffect hook
  // useEffect(() => {
  //   modal.preload(keys);
  // }, [modal.preload]);

  const modalId = state.id;
  const open = !!modalId;

  const handleClose = () => {
    setContext({ id: null });
    setModalComponent(null);
  };

  const modalContent = useMemo(() => {
    return ModalComponent && modalId ? (
      <ModalComponent
        close={handleClose}
        props={state.props}
        onSubmit={state.onSubmit}
        onCancel={state.onCancel}
      />
    ) : null;
  }, [ModalComponent, modalId, state.onSubmit, state.onCancel]);

  return (
    <ModalContext.Provider value={{ context: state, setContext, preload }}>
      <Dialog open={open}>
        <DialogContent onClose={handleClose}>
          <Suspense fallback={<div>Loading...</div>}>{modalContent}</Suspense>
        </DialogContent>
      </Dialog>
      {children}
    </ModalContext.Provider>
  );
};

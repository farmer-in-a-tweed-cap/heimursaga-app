'use client';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
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
};

// modal context
interface IModalContextState {
  id: string | null;
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
type ModalComponent = React.ComponentType<{
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
};

// modal cache
const preloadedComponents: Record<string, ModalComponent> = {};

const preloadModal = async (id: string) => {
  if (!preloadedComponents[id] && modalRegistry[id]) {
    const module = await modalRegistry[id]();
    preloadedComponents[id] = module.default;
  }
};

export interface IModalBaseProps {
  close: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
}

// modal provider
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<IModalContextState>({ id: null });
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

  // preload usage
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

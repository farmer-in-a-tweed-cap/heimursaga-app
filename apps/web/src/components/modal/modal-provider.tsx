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

import { ModalComponent, modalRegistry } from './modal-registry';

// modal context
interface IModalContextState<T = any> {
  id: string | null;
  full?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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

// modal cache
const preloadedComponents: Record<string, ModalComponent> = {};

const preloadModal = async (id: string) => {
  if (!preloadedComponents[id] && modalRegistry[id]) {
    const modal = await modalRegistry[id]();
    preloadedComponents[id] = modal.default;
  }
};

export type ModalBaseProps<T = any> = {
  props?: T;
  close: () => void;
  onSubmit?: (data?: any) => void;
  onCancel?: (data?: any) => void;
};

// modal provider
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<IModalContextState>({
    id: null,
    full: false,
    size: 'sm',
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
        <DialogContent full={state.full} size={state.size} onClose={handleClose}>
          <Suspense fallback={<div>Loading...</div>}>{modalContent}</Suspense>
        </DialogContent>
      </Dialog>
      {children}
    </ModalContext.Provider>
  );
};

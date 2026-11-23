import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export const serviceNoteFormName = (orderId: number) => `preparar-nota-${orderId}`;

/** Preserva o registro e os filtros da tela de origem no histórico. */
export function useFormPageLocation() {
  const [params, setParams] = useSearchParams();
  const closing = useRef(false);
  const open = (name: string) => {
    closing.current = false;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('formulario', name);
      return next;
    });
  };
  const allowNavigation = () => { closing.current = true; };
  const close = () => {
    allowNavigation();
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('formulario');
      return next;
    }, { replace: true });
  };
  return { name: params.get('formulario'), open, close, allowNavigation, navigationAllowed: () => closing.current };
}

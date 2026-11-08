import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CrudResourcePage } from '../components/crud/CrudResourcePage';
import { notaServicoConfig } from '../resources/fiscal';

export function ServiceNotesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('detail');
  if (id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) {
    return <Navigate to={`/app/notas-servico/${id}`} replace />;
  }
  return <CrudResourcePage config={notaServicoConfig} onOpenDetail={(noteId) => navigate(`/app/notas-servico/${noteId}`)} />;
}

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormFiller } from '@safe-validator/form-embeddable';
import { App } from 'antd';

export default function FormFillerDemo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const isView = search.get('mode') === 'view';
  const apiBase = import.meta.env.VITE_API_BASE ?? '/api';
  const token = localStorage.getItem('token') ?? '';

  return (
    <App>
      <FormFiller
        formId={42}
        recordId={id || undefined}
        apiBase={apiBase}
        token={token}
        readOnly={isView}
        onSubmitSuccess={(newId) => navigate(`/embdemo/edit/${newId}`)}
        onCancel={() => navigate('/embdemo/list')}
      />
    </App>
  );
}

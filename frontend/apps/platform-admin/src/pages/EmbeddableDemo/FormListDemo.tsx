import { useNavigate } from 'react-router-dom';
import { FormList } from '@safe-validator/form-embeddable';
import { App } from 'antd';

export default function FormListDemo() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE ?? '/api';
  const token = localStorage.getItem('token') ?? '';

  const handleDelete = async (id: string | number) => {
    if (!confirm(`确认删除记录 ${id}？`)) return;
    const res = await fetch(`${apiBase}/forms/42/records/${id}`, {
      method: 'DELETE',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!res.ok) {
      window.alert('删除失败');
    }
  };

  return (
    <App>
      <FormList
        formId={42}
        apiBase={apiBase}
        token={token}
        title="数据列表（嵌入组件 Demo）"
        onCreate={() => navigate('/embdemo/new')}
        onView={(id) => navigate(`/embdemo/edit/${id}?mode=view`)}
        onEdit={(id) => navigate(`/embdemo/edit/${id}?mode=edit`)}
        onDelete={handleDelete}
      />
    </App>
  );
}

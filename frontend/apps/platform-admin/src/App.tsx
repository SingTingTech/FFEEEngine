import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Typography, Button, App as AntdApp } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';
import { RequireAuth } from '@/routes/RequireAuth';
import LoginPage from '@/pages/Login';
import UserPage from '@/pages/User';
import RolePage from '@/pages/Role';
import FormListPage from '@/pages/Designer/FormListPage';
import DesignerPage from '@/pages/Designer/DesignerPage';
import EmbeddableDemoIndex from '@/pages/EmbeddableDemo';
import FormListDemo from '@/pages/EmbeddableDemo/FormListDemo';
import FormFillerDemo from '@/pages/EmbeddableDemo/FormFillerDemo';

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const username = useAuthStore((s) => s.username);
  const realName = useAuthStore((s) => s.realName);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore: blacklist may already have the token */
    }
    logout();
    message.success('已退出');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          safeValidator Admin
        </Typography.Title>
        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: onLogout,
              },
            ],
          }}
        >
          <Button type="text">
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            {realName || username}
          </Button>
        </Dropdown>
      </Header>
      <Layout>
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            defaultSelectedKeys={['designer']}
            items={[
              { key: 'designer', label: <Link to="/designer">📋 表单设计器</Link> },
              { key: 'users', label: <Link to="/users">用户管理</Link> },
              { key: 'roles', label: <Link to="/roles">角色管理</Link> },
              { key: 'embdemo', label: <Link to="/embdemo">🧩 嵌入组件 Demo</Link> },
            ]}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#fff' }}>
          <Routes>
            <Route path="/users" element={<UserPage />} />
            <Route path="/roles" element={<RolePage />} />
            <Route path="/designer" element={<FormListPage />} />
            <Route path="/designer/:formId" element={<DesignerPage />} />
            <Route path="/embdemo" element={<EmbeddableDemoIndex />} />
            <Route path="/embdemo/list" element={<FormListDemo />} />
            <Route path="/embdemo/new" element={<FormFillerDemo />} />
            <Route path="/embdemo/edit/:id" element={<FormFillerDemo />} />
            <Route path="*" element={<Navigate to="/designer" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
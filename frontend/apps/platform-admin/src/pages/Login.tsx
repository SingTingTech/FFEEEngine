import { useState } from 'react';
import { Form, Input, Button, Card, Typography, App as AntdApp } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { message } = AntdApp.useApp();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const data = await authApi.login(values);
      setSession({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        username: data.user.username,
        realName: data.user.realName,
        roles: data.user.roles,
      });
      message.success('登录成功');
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          safeValidator
        </Typography.Title>
        <Form<LoginForm> layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            默认账号: admin / admin123
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
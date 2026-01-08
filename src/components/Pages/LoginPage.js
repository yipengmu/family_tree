import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Row, Col, Typography, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/authService.js';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // 发送验证码
  const sendVerificationCode = async (purpose = 'login') => {
    try {
      const email = form.getFieldValue('email');
      if (!email) {
        message.error('请先输入邮箱地址');
        return;
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        message.error('请输入有效的邮箱地址');
        return;
      }

      setCodeLoading(true);

      const result = await AuthService.sendVerificationCode(email, purpose);

      if (result.success) {
        message.success(result.message);
        setCountdown(60); // 开始60秒倒计时
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(result.error || '发送验证码失败');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      message.error('发送验证码失败，请检查网络连接');
    } finally {
      setCodeLoading(false);
    }
  };

  // 处理登录
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.login(values.email, values.password);

      if (result.success) {
        message.success('登录成功');
        // 跳转到首页
        navigate('/');
      } else {
        message.error(result.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      message.error('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册跳转
  const handleGoToRegister = () => {
    navigate('/register');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        <Card 
          style={{ 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
          bodyStyle={{ padding: '30px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={2} style={{ marginBottom: '8px' }}>登录</Title>
            <Text type="secondary">欢迎回来，请输入您的账户信息</Text>
          </div>

          <Form
            form={form}
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={handleLogin}
            autoComplete="off"
          >
            <Form.Item
              name="email"
              rules={[
                { 
                  required: true, 
                  message: '请输入您的邮箱!' 
                },
                { 
                  type: 'email', 
                  message: '请输入有效的邮箱地址!' 
                }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="邮箱地址" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { 
                  required: true, 
                  message: '请输入您的密码!' 
                },
                { 
                  min: 6, 
                  message: '密码至少需要6个字符!' 
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Row justify="space-between" align="middle">
                <Button 
                  type="link" 
                  onClick={() => sendVerificationCode('login')}
                  loading={codeLoading}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '点击开始验证'}
                </Button>
                <Button type="link" onClick={() => message.info('暂未实现密码重置功能')}>
                  忘记密码？
                </Button>
              </Row>
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <Divider>或者</Divider>

          <div style={{ textAlign: 'center' }}>
            <Text>没有账号？</Text>
            <Button type="link" onClick={handleGoToRegister}>
              立即注册
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
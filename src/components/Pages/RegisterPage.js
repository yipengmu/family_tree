import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Row, Col, Typography, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/authService.js';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // 发送验证码
  const sendVerificationCode = async () => {
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

      const result = await AuthService.sendVerificationCode(email, 'register');

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

  // 处理注册
  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.register(values.name, values.email, values.password, values.code);

      if (result.success) {
        message.success('注册成功');
        // 跳转到首页
        navigate('/');
      } else {
        message.error(result.error || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      message.error('注册失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理登录跳转
  const handleGoToLogin = () => {
    navigate('/login');
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
            <Title level={2} style={{ marginBottom: '8px' }}>创建账号</Title>
            <Text type="secondary">开启你的家谱</Text>
          </div>

          <Form
            form={form}
            name="register_form"
            initialValues={{ remember: true }}
            onFinish={handleRegister}
            autoComplete="off"
          >
            <Form.Item
              name="name"
              rules={[
                { 
                  required: true, 
                  message: '请输入您的姓名!' 
                },
                { 
                  max: 50, 
                  message: '姓名不能超过50个字符!' 
                }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="姓名" 
                size="large"
              />
            </Form.Item>

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
                },
                { 
                  max: 100, 
                  message: '密码不能超过100个字符!' 
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="code"
              rules={[
                { 
                  required: true, 
                  message: '请输入验证码!' 
                },
                { 
                  pattern: /^\d{6}$/, 
                  message: '请输入6位数字验证码!' 
                }
              ]}
            >
              <Row gutter={8}>
                <Col span={16}>
                  <Input 
                    placeholder="验证码" 
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Button 
                    block
                    size="large"
                    onClick={sendVerificationCode}
                    loading={codeLoading}
                    disabled={countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取'}
                  </Button>
                </Col>
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
                创建账号
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text>已有账号？</Text>
            <Button type="link" onClick={handleGoToLogin}>
              立即登录
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
import React, { useState } from "react";
import { Card, Form, Input, Button, message, Typography, Divider } from "antd";
import {
  ArrowLeftOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../../services/authService.js";
import BRAND from "../../constants/brand.js";

const { Title, Text } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 处理登录
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.login(values.email, values.password);

      if (result.success) {
        message.success("登录成功");
        navigate(location.state?.returnTo || "/", { replace: true });
      } else {
        message.error(result.error || "登录失败");
      }
    } catch (error) {
      console.error("登录失败:", error);
      message.error("登录失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  // 处理注册跳转
  const handleGoToRegister = () => {
    navigate("/register", { state: location.state });
  };

  const handleBack = () => {
    navigate(location.state?.from || "/");
  };

  return (
    <div className="auth-page">
      <button
        type="button"
        className="auth-back-button"
        onClick={handleBack}
        aria-label="返回家谱"
      >
        <ArrowLeftOutlined />
        <span>返回家谱</span>
      </button>
      <div className="auth-shell">
        <Card className="auth-card">
          <div className="auth-heading">
            <div className="auth-seal">{BRAND.seal}</div>
            <Title level={2}>回到谱里</Title>
            <Text type="secondary">继续整理你们家的名字与故事</Text>
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
                  message: "请输入您的邮箱!",
                },
                {
                  type: "email",
                  message: "请输入有效的邮箱地址!",
                },
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
                  message: "请输入您的密码!",
                },
                {
                  min: 6,
                  message: "密码至少需要6个字符!",
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="link"
                onClick={() =>
                  navigate("/reset-password", { state: location.state })
                }
              >
                忘记密码？
              </Button>
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

          <div style={{ textAlign: "center" }}>
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

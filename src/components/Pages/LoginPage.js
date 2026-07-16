import React, { useState } from "react";
import {
  AutoComplete,
  Form,
  Input,
  Button,
  message,
  Typography,
  Divider,
} from "antd";
import { HistoryOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../../services/authService.js";
import {
  clearLoginAccountHistory,
  getLoginAccountHistory,
  rememberLoginAccount,
} from "../../utils/loginAccountHistory.js";
import { trackEvent } from "../../utils/analytics.js";
import AuthPageLayout from "./AuthPageLayout.js";

const { Text } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginAccounts, setLoginAccounts] = useState(() =>
    getLoginAccountHistory(),
  );
  const navigate = useNavigate();
  const location = useLocation();

  const accountOptions = loginAccounts.map((account) => ({
    value: account,
    label: (
      <span className="login-account-option">
        <HistoryOutlined aria-hidden="true" />
        {account}
      </span>
    ),
  }));

  // 处理登录
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.login(values.email, values.password);

      if (result.success) {
        setLoginAccounts(
          rememberLoginAccount(result.user?.email || values.email),
        );
        message.success("登录成功");
        trackEvent("login_complete", { source: "login-page" });
        navigate(location.state?.returnTo || "/app", { replace: true });
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

  const handleAccountSelect = (account) => {
    form.setFieldsValue({ email: account, password: "" });
  };

  const handleClearAccountHistory = () => {
    clearLoginAccountHistory();
    setLoginAccounts([]);
  };

  // 处理注册跳转
  const handleGoToRegister = () => {
    navigate("/register", { state: location.state });
  };

  const handleBack = () => {
    navigate(location.state?.from || "/");
  };

  return (
    <AuthPageLayout
      backLabel="返回"
      onBack={handleBack}
      title="回到谱里"
      subtitle="继续整理你们家的名字与故事"
      footer={
        <>
          <Text>没有账号？</Text>
          <Button type="link" onClick={handleGoToRegister}>
            立即注册
          </Button>
        </>
      }
    >
      <Form
        form={form}
        name="login_form"
        initialValues={{ remember: true }}
        onFinish={handleLogin}
        autoComplete="off"
      >
        <Form.Item
          name="email"
          className="login-account-field"
          extra={
            <div className="login-account-history-note">
              <Text type="secondary"> </Text>
              {loginAccounts.length > 0 ? (
                <Button type="link" onClick={handleClearAccountHistory}>
                  清除历史
                </Button>
              ) : null}
            </div>
          }
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
          <AutoComplete
            options={accountOptions}
            onSelect={handleAccountSelect}
            filterOption={(inputValue, option) =>
              option.value.toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            <Input
              prefix={<MailOutlined />}
              suffix={
                loginAccounts.length > 0 ? (
                  <HistoryOutlined aria-label="可选择登录历史" />
                ) : null
              }
              placeholder="邮箱地址"
              size="large"
            />
          </AutoComplete>
        </Form.Item>

        <Form.Item
          name="password"
          extra={
            <div className="login-account-history-note">
              <Text type="secondary"> </Text>
              <Button
                type="link"
                onClick={() =>
                  navigate("/reset-password", { state: location.state })
                }
                className="login-forgot-link"
              >
                忘记密码？
              </Button>
            </div>
          }
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
    </AuthPageLayout>
  );
};

export default LoginPage;

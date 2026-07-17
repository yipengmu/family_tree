import React, { useState } from "react";
import {
  AutoComplete,
  Form,
  Input,
  Button,
  message,
  Typography,
  Divider,
  Segmented,
} from "antd";
import {
  HistoryOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../../services/authService.js";
import {
  getLoginAccountHistory,
  rememberLoginAccount,
} from "../../utils/loginAccountHistory.js";
import { trackEvent } from "../../utils/analytics.js";
import AuthPageLayout from "./AuthPageLayout.js";

const { Text } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("phone");
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
      const account = mode === "phone" ? values.phone : values.email;
      const result = await AuthService.login(account, values.password);

      if (result.success) {
        if (mode === "email") {
          setLoginAccounts(
            rememberLoginAccount(result.user?.email || values.email),
          );
        }
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
      title="谱里"
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
        <Segmented
          block
          className="login-mode-tabs"
          value={mode}
          onChange={setMode}
          options={[
            { label: "手机号登录", value: "phone" },
            { label: "邮箱密码", value: "email" },
          ]}
        />
        {mode === "phone" ? (
          <>
            <Form.Item
              name="phone"
              rules={[
                { required: true, message: "请输入手机号" },
                { pattern: /^1[3-9]\d{9}$/, message: "请输入有效的手机号" },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="手机号"
                size="large"
                inputMode="tel"
              />
            </Form.Item>
          </>
        ) : null}
        {mode === "email" ? (
          <Form.Item
            name="email"
            className="login-account-field"
            rules={[
              {
                required: true,
                message: "请输入您的邮箱",
              },
              {
                type: "email",
                message: "请输入有效的邮箱地址",
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
        ) : null}

        {mode === "phone" || mode === "email" ? (
          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: "请输入您的密码",
              },
              {
                min: 6,
                message: "密码至少需要6个字符",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
        ) : null}

        <div className="login-secondary-action">
          <Button
            type="link"
            onClick={() =>
              navigate("/reset-password", { state: location.state })
            }
            className="login-forgot-link"
          >
            找回密码
          </Button>
        </div>

        <Form.Item className="auth-submit-item">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            登录账号
          </Button>
        </Form.Item>
      </Form>

      <Divider>或者</Divider>
    </AuthPageLayout>
  );
};

export default LoginPage;

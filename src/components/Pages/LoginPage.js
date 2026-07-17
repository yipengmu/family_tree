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
import { HistoryOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
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
  const [mode, setMode] = useState("phone");
  const [phoneCodeLoading, setPhoneCodeLoading] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
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

  const handlePhoneCode = async () => {
    const phone = form.getFieldValue("phone")?.trim();
    if (!/^1[3-9]\d{9}$/.test(phone || "")) {
      message.error("请输入有效的手机号");
      return;
    }
    setPhoneCodeLoading(true);
    try {
      const result = await AuthService.sendPhoneCode(phone);
      if (!result.success) {
        message.error(result.error || "验证码发送失败");
        return;
      }
      message.success("验证码已发送");
      setPhoneCountdown(60);
      const timer = setInterval(() => {
        setPhoneCountdown((value) => {
          if (value <= 1) {
            clearInterval(timer);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    } finally {
      setPhoneCodeLoading(false);
    }
  };

  const handlePhoneLogin = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.phoneLogin(values.phone, values.phoneCode);
      if (!result.success) {
        message.error(result.error || "登录失败");
        return;
      }
      message.success("登录成功");
      trackEvent("phone_auth_completed", { source: "login-page" });
      navigate(location.state?.returnTo || "/app/create", { replace: true });
    } catch (error) {
      message.error(error.message || "登录失败，请稍后重试");
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
      title="谱里"
      subtitle="续写每个名字背后的故事"
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
        onFinish={mode === "phone" ? handlePhoneLogin : handleLogin}
        autoComplete="off"
      >
        <Segmented
          block
          value={mode}
          onChange={setMode}
          options={[{ label: "手机号登录", value: "phone" }, { label: "邮箱密码", value: "email" }]}
          style={{ marginBottom: 20 }}
        />
        {mode === "phone" ? (
          <>
            <Form.Item
              name="phone"
              rules={[{ required: true, message: "请输入手机号" }, { pattern: /^1[3-9]\d{9}$/, message: "请输入有效的手机号" }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="手机号" size="large" inputMode="tel" />
            </Form.Item>
            <Form.Item
              name="phoneCode"
              rules={[{ required: true, message: "请输入验证码" }, { pattern: /^\d{6}$/, message: "请输入6位验证码" }]}
            >
              <Input.Group compact>
                <Input style={{ width: "68%" }} placeholder="验证码" size="large" inputMode="numeric" />
                <Button style={{ width: "32%" }} size="large" onClick={handlePhoneCode} loading={phoneCodeLoading} disabled={phoneCountdown > 0}>
                  {phoneCountdown > 0 ? `${phoneCountdown}s` : "获取验证码"}
                </Button>
              </Input.Group>
            </Form.Item>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              首次验证手机号将自动创建家谱，姓名会在录入本人时填写。
            </Typography.Paragraph>
          </>
        ) : null}
        {mode === "email" ? <Form.Item
          name="email"
          className="login-account-field"
          extra={
            <div className="login-account-history-note">
              <Text type="secondary">仅保存邮箱，不保存密码</Text>
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
        </Form.Item> : null}

        {mode === "email" ? <Form.Item
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
        </Form.Item> : null}

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

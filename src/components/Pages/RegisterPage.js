import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  message,
  Typography,
  Divider,
} from "antd";
import {
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../../services/authService.js";
import tenantService from "../../services/tenantService.js";
import BRAND from "../../constants/brand.js";
import { trackEvent } from "../../utils/analytics.js";
import AuthPageLayout from "./AuthPageLayout.js";

const { Text } = Typography;

const RegisterPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const sendVerificationCode = async () => {
    try {
      await form.validateFields(["phone", "privacyConsent"]);
      const phone = form.getFieldValue("phone")?.trim();

      setCodeLoading(true);
      const result = await AuthService.sendPhoneCode(phone, "register");

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
        message.error(result.error || "发送验证码失败");
      }
    } catch (error) {
      console.error("发送验证码失败:", error);
      if (error?.errorFields) return;
      message.error(error?.message || "发送验证码失败，请检查网络连接");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.registerPhone(
        values.phone,
        values.code,
        values.password,
        values.email,
      );

      if (result.success) {
        message.success("注册成功");
        trackEvent("registration_complete", { source: "register-page" });
        if (result.tenant) tenantService.setCurrentTenant(result.tenant);
        navigate(location.state?.returnTo || "/app/create", { replace: true });
      } else {
        message.error(result.error || "注册失败");
      }
    } catch (error) {
      console.error("注册失败:", error);
      message.error("注册失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  // 处理登录跳转
  const handleGoToLogin = () => {
    navigate("/login", { state: location.state });
  };

  const handleBack = () => {
    navigate(location.state?.from || "/");
  };

  return (
    <AuthPageLayout
      backLabel="返回"
      onBack={handleBack}
      title={BRAND.tagline}
      footer={
        <>
          <Text>已有账号？</Text>
          <Button type="link" onClick={handleGoToLogin}>
            立即登录
          </Button>
        </>
      }
    >
      <Form
        form={form}
        name="register_form"
        initialValues={{ privacyConsent: false }}
        onFinish={handleRegister}
        autoComplete="off"
      >
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

        <Form.Item
          name="code"
          className="phone-code-field"
          rules={[
            { required: true, message: "请输入验证码" },
            { pattern: /^\d{6}$/, message: "请输入6位数字验证码" },
          ]}
        >
          <Input
            prefix={<SafetyCertificateOutlined />}
            placeholder="验证码"
            size="large"
            inputMode="numeric"
            maxLength={6}
            suffix={
              <Button
                type="link"
                className="phone-code-button"
                onClick={sendVerificationCode}
                loading={codeLoading}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            }
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: "请设置登录密码" },
            { min: 6, max: 100, message: "密码长度需为6至100个字符" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="设置密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "请再次输入密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="确认密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="邮箱（用于密码找回）"
            size="large"
          />
        </Form.Item>

        <Form.Item className="auth-submit-item">
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
    </AuthPageLayout>
  );
};

export default RegisterPage;

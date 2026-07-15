import React, { useState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Col, Form, Input, message, Row } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../../services/authService.js";
import AuthPageLayout from "./AuthPageLayout.js";

const ResetPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const sendResetCode = async () => {
    try {
      await form.validateFields(["email"]);
      const email = form.getFieldValue("email").trim().toLowerCase();
      setCodeLoading(true);
      const result = await AuthService.sendVerificationCode(email, "reset");
      if (result.success) {
        message.success(result.message || "验证码已发送，请查收邮件");
        startCountdown();
      } else {
        message.error(result.error || "发送验证码失败");
      }
    } catch (error) {
      if (!error?.errorFields) {
        message.error("发送验证码失败，请检查网络连接");
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleReset = async (values) => {
    setLoading(true);
    try {
      const result = await AuthService.resetPassword(
        values.email,
        values.code,
        values.newPassword,
      );
      if (result.success) {
        message.success(result.message || "密码重置成功");
        navigate("/login", { replace: true, state: location.state });
      } else {
        message.error(result.error || "密码重置失败");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      backLabel="返回登录"
      onBack={() => navigate("/login")}
      title="找回密码"
      subtitle="通过注册邮箱验证后设置新密码"
    >
      <Form
        form={form}
        name="reset_password_form"
        onFinish={handleReset}
        autoComplete="off"
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: "请输入您的邮箱!" },
            { type: "email", message: "请输入有效的邮箱地址!" },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="邮箱地址"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="code"
          rules={[
            { required: true, message: "请输入验证码!" },
            { pattern: /^\d{6}$/, message: "请输入6位数字验证码!" },
          ]}
        >
          <Row gutter={8}>
            <Col span={16}>
              <Input
                placeholder="邮箱验证码"
                size="large"
                inputMode="numeric"
              />
            </Col>
            <Col span={8}>
              <Button
                block
                size="large"
                onClick={sendResetCode}
                loading={codeLoading}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : "获取"}
              </Button>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          name="newPassword"
          rules={[
            { required: true, message: "请输入新密码!" },
            { min: 6, max: 100, message: "密码长度需为6至100个字符!" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="新密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入新密码!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value)
                  return Promise.resolve();
                return Promise.reject(new Error("两次输入的密码不一致!"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="确认新密码"
            size="large"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
        >
          重置密码
        </Button>
      </Form>
    </AuthPageLayout>
  );
};

export default ResetPasswordPage;

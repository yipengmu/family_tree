import React, { useState } from "react";
import { Button, Form, Input, Progress, Radio } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { countFirstFamilyMembers } from "../../utils/firstFamily.js";
import "./FirstFamilyWizard.css";

const steps = [
  { title: "从你开始", hint: "先确定家谱中的起点" },
  { title: "写下父母", hint: "不知道或暂时不想填，可以跳过" },
  { title: "补到祖辈", hint: "知道多少写多少" },
];

const getStoredUserName = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").name || "";
  } catch (error) {
    return "";
  }
};

function FirstFamilyWizard({ busy, familyName, onComplete, onExit }) {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [memberCount, setMemberCount] = useState(1);
  const fatherName = Form.useWatch("fatherName", form);
  const motherName = Form.useWatch("motherName", form);

  const goNext = async () => {
    if (step === 0) await form.validateFields(["selfName", "selfSex"]);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <main className="first-family-page">
      <header className="first-family-topbar">
        <button type="button" onClick={onExit} aria-label="返回家谱">
          <ArrowLeftOutlined />
        </button>
        <span>{familyName || "我的家谱"}</span>
        <span className="first-family-private">
          <LockOutlined /> 私密
        </span>
      </header>

      <div className="first-family-shell">
        <section className="first-family-heading">
          <span>建立第一版家谱</span>
          <h1>{steps[step].title}</h1>
          <p>{steps[step].hint}</p>
          <Progress
            percent={((step + 1) / steps.length) * 100}
            showInfo={false}
            strokeColor="#a64632"
            trailColor="#e5ded0"
          />
        </section>

        <Form
          form={form}
          layout="vertical"
          className="first-family-form"
          initialValues={{ selfName: getStoredUserName(), selfSex: "MAN" }}
          onValuesChange={(_, allValues) =>
            setMemberCount(countFirstFamilyMembers(allValues) || 1)
          }
          onFinish={onComplete}
        >
          <div hidden={step !== 0}>
            <Form.Item
              name="selfName"
              label="你的姓名"
              rules={[{ required: true, message: "请填写你的姓名" }]}
            >
              <Input
                prefix={<UserOutlined />}
                size="large"
                placeholder="请输入姓名"
                maxLength={30}
                autoFocus
              />
            </Form.Item>
            <Form.Item
              name="selfSex"
              label="性别"
              rules={[{ required: true, message: "请选择性别" }]}
            >
              <Radio.Group
                className="first-family-choice"
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="MAN">男</Radio.Button>
                <Radio.Button value="WOMAN">女</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <div className="first-family-grid">
              <Form.Item name="birthDate" label="出生时间（可选）">
                <Input size="large" placeholder="例如 1988 年" />
              </Form.Item>
              <Form.Item name="location" label="籍贯或居住地（可选）">
                <Input size="large" placeholder="例如 山东临沂" />
              </Form.Item>
            </div>
          </div>

          <div hidden={step !== 1}>
            <div className="first-family-grid">
              <Form.Item name="fatherName" label="父亲姓名">
                <Input
                  size="large"
                  placeholder="可以稍后补充"
                  maxLength={30}
                  autoFocus
                />
              </Form.Item>
              <Form.Item name="motherName" label="母亲姓名">
                <Input size="large" placeholder="可以稍后补充" maxLength={30} />
              </Form.Item>
            </div>
            <p className="first-family-note">
              只知道其中一位也可以继续，家谱不会替你猜测未知信息。
            </p>
          </div>

          <div hidden={step !== 2}>
            {fatherName ? (
              <fieldset className="first-family-branch">
                <legend>{fatherName} 的父母</legend>
                <div className="first-family-grid">
                  <Form.Item name="paternalGrandfatherName" label="祖父姓名">
                    <Input
                      size="large"
                      placeholder="不知道可留空"
                      maxLength={30}
                    />
                  </Form.Item>
                  <Form.Item name="paternalGrandmotherName" label="祖母姓名">
                    <Input
                      size="large"
                      placeholder="不知道可留空"
                      maxLength={30}
                    />
                  </Form.Item>
                </div>
              </fieldset>
            ) : null}
            {motherName ? (
              <fieldset className="first-family-branch">
                <legend>{motherName} 的父母</legend>
                <div className="first-family-grid">
                  <Form.Item name="maternalGrandfatherName" label="外祖父姓名">
                    <Input
                      size="large"
                      placeholder="不知道可留空"
                      maxLength={30}
                    />
                  </Form.Item>
                  <Form.Item name="maternalGrandmotherName" label="外祖母姓名">
                    <Input
                      size="large"
                      placeholder="不知道可留空"
                      maxLength={30}
                    />
                  </Form.Item>
                </div>
              </fieldset>
            ) : null}
            {!fatherName && !motherName ? (
              <div className="first-family-empty-branch">
                <UserOutlined />
                <strong>先从自己开始也很好</strong>
                <span>生成后可以继续添加父母和祖辈。</span>
              </div>
            ) : null}
            <p className="first-family-count">
              即将生成包含 {memberCount || 1} 位家人的第一版家谱
            </p>
          </div>

          <footer className="first-family-actions">
            {step > 0 ? (
              <Button
                size="large"
                onClick={() => setStep((current) => current - 1)}
                icon={<ArrowLeftOutlined />}
              >
                上一步
              </Button>
            ) : (
              <span />
            )}
            {step < steps.length - 1 ? (
              <Button type="primary" size="large" onClick={goNext}>
                下一步 <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={busy}
                icon={<CheckOutlined />}
              >
                生成我的家谱
              </Button>
            )}
          </footer>
        </Form>
      </div>
    </main>
  );
}

export default FirstFamilyWizard;

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, message, Radio, Select } from "antd";
import AppLayout from "../Layout/AppLayout.js";
import familyDataService from "../../services/familyDataService.js";
import tenantService from "../../services/tenantService.js";
import { getLifeStatusFields } from "../../utils/paternalOnboarding.js";
import {
  isPersonAlive,
  normalizePersonLifeStatus,
} from "../../utils/personLifeStatus.js";
import "./PersonEditPage.css";

function PersonEditPage({
  person,
  familyData = [],
  onMenuClick,
  onBack,
}) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const tenant = tenantService.getCurrentTenant();

  const fatherOptions = useMemo(
    () =>
      familyData
        .filter((item) => item.name && (item.id ?? item.person_id) != null)
        .filter(
          (item) =>
            String(item.id ?? item.person_id) !==
            String(person?.id ?? person?.person_id),
        )
        .map((item) => ({
          value: item.id ?? item.person_id,
          label: `${item.name} · 第${item.g_rank || 1}代`,
        })),
    [familyData, person],
  );

  useEffect(() => {
    if (!person) return;
    form.setFieldsValue({
      ...person,
      lifeStatus: isPersonAlive(person)
        ? "living"
        : person.dealth === "unknown" || person.death_date === "unknown"
          ? "unknown"
          : "deceased",
    });
  }, [form, person]);

  const save = async (values) => {
    if (!person?.person_id || tenant?.id === "default") return;
    const lifeFields = getLifeStatusFields(values.lifeStatus);
    const normalized = normalizePersonLifeStatus({
      ...person,
      ...values,
      ...lifeFields,
      g_rank: Number(values.g_rank) || 1,
      rank_index: Number(values.rank_index) || 1,
      g_father_id: values.g_father_id
        ? Number(values.g_father_id) || values.g_father_id
        : 0,
      updated_at: new Date().toISOString(),
    });
    try {
      setBusy(true);
      await familyDataService.updatePerson(person.person_id, {
        name: normalized.name,
        sex: normalized.sex,
        ...lifeFields,
        g_rank: normalized.g_rank,
        rank_index: normalized.rank_index,
        g_father_id: normalized.g_father_id,
        birth_date: normalized.birth_date || "",
        spouse: normalized.spouse || "",
        location: normalized.location || "",
        official_position: normalized.official_position || "",
        summary: normalized.summary || "",
      }, tenant.id);
      window.dispatchEvent(
        new CustomEvent("familyDataUpdated", { detail: { tenantId: tenant.id } }),
      );
      message.success("人物资料已保存");
      onBack();
    } catch (error) {
      message.error(`保存失败：${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!person) {
    return (
      <AppLayout activeMenuItem="person" onMenuClick={onMenuClick} familyData={familyData} immersiveMobile>
        <main className="person-edit-page person-edit-missing"><h1>没有找到这位家人</h1><Button onClick={onBack}>返回家谱</Button></main>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="person" onMenuClick={onMenuClick} familyData={familyData} immersiveMobile>
      <main className="person-edit-page">
        <div className="person-edit-topbar">
          <button type="button" className="person-edit-back" onClick={onBack}>
            <ArrowLeftOutlined /> 返回人物档案
          </button>
          <span>家人资料</span>
        </div>
        <section className="person-edit-shell">
          <header className="person-edit-heading">
            <div className="person-edit-avatar">{person.name?.slice(-1)}</div>
            <div><span>第 {person.g_rank || 1} 代 · 资料维护</span><h1>修改 {person.name} 的资料</h1><p>保存后会直接同步到当前私密家谱。</p></div>
          </header>
          <Form form={form} layout="vertical" onFinish={save} className="person-edit-form">
            <section className="person-edit-section"><div className="person-edit-section-title"><span>01</span><div><h2>基础信息</h2><p>先确认这位家人的身份与状态</p></div></div>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请填写家人姓名" }]}><Input size="large" maxLength={30} /></Form.Item>
              <div className="person-edit-grid"><Form.Item name="sex" label="性别"><Select size="large" options={[{ value: "MAN", label: "男" }, { value: "WOMAN", label: "女" }]} /></Form.Item><Form.Item name="lifeStatus" label="生存状态"><Radio.Group className="person-life-status" optionType="button" buttonStyle="solid"><Radio.Button value="unknown">待确认</Radio.Button><Radio.Button value="living">在世</Radio.Button><Radio.Button value="deceased">已故</Radio.Button></Radio.Group></Form.Item></div>
            </section>
            <section className="person-edit-section"><div className="person-edit-section-title"><span>02</span><div><h2>家族关系</h2><p>关系越准确，家谱越容易被后人读懂</p></div></div>
              <Form.Item name="g_father_id" label="父亲 / 所属支系"><Select size="large" showSearch allowClear optionFilterProp="label" options={fatherOptions} placeholder="输入姓名查找，也可以暂不关联" /></Form.Item>
              <div className="person-edit-grid"><Form.Item name="g_rank" label="世代"><Input size="large" type="number" min="1" inputMode="numeric" /></Form.Item><Form.Item name="rank_index" label="同代排行"><Input size="large" type="number" min="1" inputMode="numeric" /></Form.Item></div>
            </section>
            <section className="person-edit-section"><div className="person-edit-section-title"><span>03</span><div><h2>出生、地点与更多资料</h2><p>不确定的内容可以留空，之后再慢慢补充</p></div></div>
              <div className="person-edit-grid"><Form.Item name="birth_date" label="出生时间"><Input size="large" placeholder="例如：1988年或1988-06-12" /></Form.Item><Form.Item name="location" label="籍贯或居住地"><Input size="large" prefix={<EnvironmentOutlined />} placeholder="例如：山东省临沂市" /></Form.Item></div>
              <div className="person-edit-grid"><Form.Item name="spouse" label="配偶"><Input size="large" /></Form.Item><Form.Item name="official_position" label="职业或身份"><Input size="large" /></Form.Item></div>
              <Form.Item name="summary" label="人物记述"><Input.TextArea rows={4} maxLength={500} showCount placeholder="职业、经历，或一段想留给后人的话" /></Form.Item>
            </section>
            <div className="person-edit-submit"><Button onClick={onBack}>取消</Button><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={busy}>保存修改</Button></div>
          </Form>
        </section>
      </main>
    </AppLayout>
  );
}

export default PersonEditPage;

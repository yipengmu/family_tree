import React, { useState } from "react";
import {
  Button,
  Card,
  List,
  Modal,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloudDownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import AppLayout from "../Layout/AppLayout.js";
import tenantService from "../../services/tenantService.js";
import BRAND from "../../constants/brand.js";
import "./SettingsPage.css";

const { Title, Text, Paragraph } = Typography;

const SettingsPage = ({
  activeMenuItem = "settings",
  onMenuClick,
  familyData = [],
}) => {
  const tenant = tenantService.getCurrentTenant();
  const canManagePrivacy = tenant?.role === "OWNER";
  const [privacy, setPrivacy] = useState(() => ({
    living: {
      birthDate:
        tenant?.privacy?.living?.birthDate ||
        tenant?.settings?.privacy?.living?.birthDate ||
        "YEAR",
      location:
        tenant?.privacy?.living?.location ||
        tenant?.settings?.privacy?.living?.location ||
        "HIDDEN",
      sensitiveFields:
        tenant?.privacy?.living?.sensitiveFields ||
        tenant?.settings?.privacy?.living?.sensitiveFields ||
        "HIDDEN",
    },
  }));
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const generationCount = new Set(
    familyData.map((person) => person.g_rank).filter(Boolean),
  ).size;

  const updatePrivacy = async (key, value) => {
    const previous = privacy;
    const next = { ...privacy, living: { ...privacy.living, [key]: value } };
    setPrivacy(next);
    setPrivacyBusy(true);
    try {
      await tenantService.updatePrivacySettings(next);
      message.success("字段隐私设置已保存");
    } catch (error) {
      setPrivacy(previous);
      message.error(error.message);
    } finally {
      setPrivacyBusy(false);
    }
  };

  const clearLocalCache = async () => {
    setResetLoading(true);
    try {
      const familyDataService = (
        await import("../../services/familyDataService")
      ).default;
      familyDataService.clearAllCache();
      message.success("本机缓存已清除，在线家谱数据不受影响");
    } finally {
      setResetLoading(false);
    }
  };

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { tenant, familyData, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tenant?.name || "我的家谱"}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const privacyItems = [
    {
      key: "birthDate",
      title: "在世人物只显示出生年份",
      description: "访客和普通成员不会看到完整出生日期",
      checked: privacy.living.birthDate !== "FULL",
    },
    {
      key: "location",
      title: "隐藏在世人物居住地",
      description: "避免住址和当前生活地点被扩散",
      checked: privacy.living.location === "HIDDEN",
    },
    {
      key: "sensitiveFields",
      title: "隐藏证件、住址和照片字段",
      description: "仅 Owner/Editor 默认可见，普通成员不返回这些字段",
      checked: privacy.living.sensitiveFields !== "FAMILY",
    },
  ];

  const getPrivacyValue = (key, checked) => {
    if (key === "birthDate") return checked ? "YEAR" : "FULL";
    return checked ? "HIDDEN" : "FAMILY";
  };

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="settings-page">
        <div className="settings-container">
          <header className="settings-page-header">
            <div>
              <Text className="settings-kicker">管家谱</Text>
              <Title level={2}>家谱设置</Title>
              <Paragraph>管理家谱隐私、数据备份与本机维护。</Paragraph>
            </div>
            <div className="settings-family-summary">
              <div>
                <Text type="secondary">当前家谱</Text>
                <strong>{tenant?.name || "我的家谱"}</strong>
              </div>
              <Tag color="green">默认私密</Tag>
            </div>
          </header>

          <div className="settings-grid">
            <Card
              title="字段隐私"
              className="settings-card settings-privacy-card"
              extra={
                <SafetyCertificateOutlined className="settings-card-extra" />
              }
            >
              <Paragraph className="settings-card-intro">
                控制普通成员看到的在世人物字段；原始资料仍保存在你的家谱空间。
              </Paragraph>
              <List
                dataSource={privacyItems}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Switch
                        key={item.key}
                        aria-label={item.title}
                        checked={item.checked}
                        loading={privacyBusy}
                        disabled={!canManagePrivacy}
                        onChange={(checked) =>
                          updatePrivacy(
                            item.key,
                            getPrivacyValue(item.key, checked),
                          )
                        }
                      />,
                    ]}
                    className="settings-list-item"
                  >
                    <List.Item.Meta
                      avatar={
                        <span className="settings-icon">
                          <SafetyCertificateOutlined />
                        </span>
                      }
                      title={
                        <span className="settings-title">{item.title}</span>
                      }
                      description={
                        <span className="settings-description">
                          {item.description}
                          {!canManagePrivacy && "（仅 Owner 可修改）"}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <div className="settings-side-column">
              <Card
                title="家谱概况"
                className="settings-card settings-stats-card"
              >
                <div className="settings-stats">
                  <div className="stat-item">
                    <strong>{familyData.length}</strong>
                    <span>位族人</span>
                  </div>
                  <div className="stat-item">
                    <strong>{generationCount}</strong>
                    <span>代相承</span>
                  </div>
                  <div className="stat-item">
                    <TeamOutlined />
                    <span>自动保存</span>
                  </div>
                </div>
              </Card>

              <Card
                title="数据管理"
                className="settings-card settings-data-card"
              >
                <Button
                  block
                  icon={<CloudDownloadOutlined />}
                  onClick={exportData}
                  className="settings-action-button settings-action-primary"
                >
                  <span>
                    <strong>导出家谱数据</strong>
                    <small>下载 JSON 备份，随时带走</small>
                  </span>
                </Button>

                <div className="settings-maintenance-row">
                  <div>
                    <strong>本机缓存</strong>
                    <span>遇到本机显示异常时可清除，不影响云端数据</span>
                  </div>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={clearLocalCache}
                    loading={resetLoading}
                  >
                    清除
                  </Button>
                </div>
              </Card>

              <Button
                type="text"
                icon={<InfoCircleOutlined />}
                onClick={() => setAboutVisible(true)}
                className="settings-about-button"
              >
                关于{BRAND.name}
              </Button>
            </div>
          </div>
        </div>

        <Modal
          className="settings-about-modal"
          title={`关于${BRAND.name}`}
          open={aboutVisible}
          onCancel={() => setAboutVisible(false)}
          footer={[
            <Button
              key="close"
              type="primary"
              onClick={() => setAboutVisible(false)}
            >
              知道了
            </Button>,
          ]}
        >
          <Title level={4}>{BRAND.name}数字家谱</Title>
          <Paragraph>{BRAND.description}</Paragraph>
          <Paragraph type="secondary">
            家谱默认私密，家人资料由你管理，数据可以随时导出。
          </Paragraph>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;

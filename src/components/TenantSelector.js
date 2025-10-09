import React, { useState, useEffect } from 'react';
import { Select, Button, Modal, Form, Input, Switch, message, Space, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import tenantService from '../services/tenantService';
import './TenantSelector.css';

const { Option } = Select;

const TenantSelector = ({ onTenantChange, style, compact = false }) => {
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载租户列表
  const loadTenants = async () => {
    try {
      setLoading(true);
      const tenantList = await tenantService.getTenantList();
      setTenants(tenantList);
      
      const current = tenantService.getCurrentTenant();
      setCurrentTenant(current);
    } catch (error) {
      console.error('加载租户列表失败:', error);
      message.error('加载租户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换租户
  const handleTenantChange = async (tenantId) => {
    try {
      setLoading(true);
      const tenant = await tenantService.switchTenant(tenantId);
      setCurrentTenant(tenant);
      
      message.success(`已切换到 ${tenant.name}`);
      
      // 通知父组件
      if (onTenantChange) {
        onTenantChange(tenant);
      }
    } catch (error) {
      console.error('切换租户失败:', error);
      message.error('切换租户失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新租户
  const handleCreateTenant = async (values) => {
    try {
      setLoading(true);
      const tenant = await tenantService.createTenant(values);
      
      // 刷新租户列表
      await loadTenants();
      
      // 切换到新创建的租户
      await handleTenantChange(tenant.id);
      
      setModalVisible(false);
      form.resetFields();
      message.success(`租户 ${tenant.name} 创建成功`);
    } catch (error) {
      console.error('创建租户失败:', error);
      message.error('创建租户失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除租户
  const handleDeleteTenant = async (tenantId, tenantName) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除租户 "${tenantName}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await tenantService.deleteTenant(tenantId);
          await loadTenants();
          message.success('租户删除成功');
        } catch (error) {
          console.error('删除租户失败:', error);
          message.error(error.message || '删除租户失败');
        }
      },
    });
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadTenants();
    
    // 监听租户切换事件
    const unsubscribe = tenantService.onTenantChange((tenant) => {
      setCurrentTenant(tenant);
      if (onTenantChange) {
        onTenantChange(tenant);
      }
    });

    return unsubscribe;
  }, [onTenantChange]);

  // 如果不是多租户模式，不显示选择器
  if (!tenantService.isMultiTenantMode()) {
    return null;
  }

  return (
    <div className={`tenant-selector ${compact ? 'compact' : ''}`} style={style}>
      {compact ? (
        // 紧凑模式：仅显示一个选择框
        <Select
          value={currentTenant?.id}
          onChange={handleTenantChange}
          loading={loading}
          style={{ width: '100%' }}
          placeholder="选择家谱"
          size="small"
          dropdownRender={(menu) => (
            <>
              {menu}
              <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(true)}
                  style={{ width: '100%', textAlign: 'left' }}
                  size="small"
                >
                  创建新家谱
                </Button>
              </div>
            </>
          )}
        >
          {tenants.map((tenant) => (
            <Option key={tenant.id} value={tenant.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px' }}>
                  {tenant.isDefault && <HomeOutlined style={{ marginRight: 4, color: '#1890ff' }} />}
                  {tenant.name}
                </span>
                {!tenant.isDefault && (
                  <Tooltip title="删除家谱">
                    <DeleteOutlined
                      style={{ color: '#ff4d4f', fontSize: '10px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTenant(tenant.id, tenant.name);
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            </Option>
          ))}
        </Select>
      ) : (
        // 常规模式：显示选择框和设置按钮
        <Space>
          <Select
            value={currentTenant?.id}
            onChange={handleTenantChange}
            loading={loading}
            style={{ minWidth: 200 }}
            placeholder="选择家谱"
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => setModalVisible(true)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    创建新家谱
                  </Button>
                </div>
              </>
            )}
          >
            {tenants.map((tenant) => (
              <Option key={tenant.id} value={tenant.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {tenant.isDefault && <HomeOutlined style={{ marginRight: 4, color: '#1890ff' }} />}
                    {tenant.name}
                  </span>
                  {!tenant.isDefault && (
                    <Tooltip title="删除家谱">
                      <DeleteOutlined
                        style={{ color: '#ff4d4f', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTenant(tenant.id, tenant.name);
                        }}
                      />
                    </Tooltip>
                  )}
                </div>
              </Option>
            ))}
          </Select>

          <Tooltip title="租户设置">
            <Button
              icon={<SettingOutlined />}
              onClick={() => {
                // TODO: 打开租户设置对话框
                message.info('租户设置功能开发中');
              }}
            />
          </Tooltip>
        </Space>
      )}

      {/* 创建租户对话框 */}
      <Modal
        title="创建新家谱"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTenant}
        >
          <Form.Item
            name="name"
            label="家谱名称"
            rules={[
              { required: true, message: '请输入家谱名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：张氏家谱、王家族谱" />
          </Form.Item>

          <Form.Item
            name="description"
            label="家谱描述"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="简要描述这个家谱的特点或来源"
            />
          </Form.Item>

          <Form.Item
            name="nameProtection"
            label="姓名保护"
            valuePropName="checked"
            extra="开启后，在公开展示时会隐藏部分姓名信息"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="publicAccess"
            label="公开访问"
            valuePropName="checked"
            extra="开启后，其他人可以查看这个家谱（只读）"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantSelector;

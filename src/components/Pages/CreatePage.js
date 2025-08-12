import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Upload, DatePicker, Radio, message } from 'antd';
import { PlusOutlined, UserAddOutlined, FileTextOutlined, CameraOutlined } from '@ant-design/icons';
import AppLayout from '../Layout/AppLayout';
import './CreatePage.css';

const { TextArea } = Input;
const { Option } = Select;

const CreatePage = ({ activeMenuItem = 'create', onMenuClick }) => {
  const [form] = Form.useForm();
  const [createType, setCreateType] = useState('member');
  const [loading, setLoading] = useState(false);

  // 处理表单提交
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('创建内容:', { type: createType, ...values });
      message.success('创建成功！');
      form.resetFields();
    } catch (error) {
      message.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
      }
      return false; // 阻止自动上传
    },
  };

  // 渲染创建成员表单
  const renderMemberForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="create-form"
    >
      <div className="form-section">
        <h3><UserAddOutlined /> 基本信息</h3>
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入家族成员姓名" />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Radio.Group>
            <Radio value="male">男</Radio>
            <Radio value="female">女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="birthDate"
          label="出生日期"
        >
          <DatePicker placeholder="选择出生日期" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="deathDate"
          label="逝世日期"
        >
          <DatePicker placeholder="选择逝世日期（如适用）" style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <div className="form-section">
        <h3><FileTextOutlined /> 家族关系</h3>
        <Form.Item
          name="parentId"
          label="父/母"
        >
          <Select placeholder="选择父亲或母亲" allowClear>
            <Option value="1">穆茂（第1代）</Option>
            <Option value="2">穆永清（第2代）</Option>
            {/* 这里可以动态加载现有成员 */}
          </Select>
        </Form.Item>

        <Form.Item
          name="spouseId"
          label="配偶"
        >
          <Select placeholder="选择配偶" allowClear>
            {/* 动态加载可选配偶 */}
          </Select>
        </Form.Item>

        <Form.Item
          name="generation"
          label="世代"
          rules={[{ required: true, message: '请输入世代' }]}
        >
          <Select placeholder="选择世代">
            {Array.from({ length: 25 }, (_, i) => (
              <Option key={i + 1} value={i + 1}>第{i + 1}代</Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      <div className="form-section">
        <h3><CameraOutlined /> 其他信息</h3>
        <Form.Item
          name="avatar"
          label="头像"
        >
          <Upload {...uploadProps}>
            <Button icon={<PlusOutlined />}>上传头像</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="occupation"
          label="职业"
        >
          <Input placeholder="请输入职业" />
        </Form.Item>

        <Form.Item
          name="location"
          label="居住地"
        >
          <Input placeholder="请输入居住地" />
        </Form.Item>

        <Form.Item
          name="description"
          label="个人描述"
        >
          <TextArea 
            rows={4} 
            placeholder="请输入个人描述、生平事迹等"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </div>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          size="large"
          className="submit-btn"
        >
          创建家族成员
        </Button>
      </Form.Item>
    </Form>
  );

  // 渲染创建故事表单
  const renderStoryForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="create-form"
    >
      <Form.Item
        name="title"
        label="故事标题"
        rules={[{ required: true, message: '请输入故事标题' }]}
      >
        <Input placeholder="请输入家族故事标题" />
      </Form.Item>

      <Form.Item
        name="category"
        label="故事类型"
        rules={[{ required: true, message: '请选择故事类型' }]}
      >
        <Select placeholder="选择故事类型">
          <Option value="legend">家族传说</Option>
          <Option value="history">历史事件</Option>
          <Option value="tradition">家族传统</Option>
          <Option value="achievement">成就故事</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="relatedMembers"
        label="相关成员"
      >
        <Select mode="multiple" placeholder="选择相关家族成员">
          <Option value="1">穆茂</Option>
          <Option value="2">穆永清</Option>
          {/* 动态加载成员列表 */}
        </Select>
      </Form.Item>

      <Form.Item
        name="content"
        label="故事内容"
        rules={[{ required: true, message: '请输入故事内容' }]}
      >
        <TextArea 
          rows={8} 
          placeholder="请详细描述这个家族故事..."
          maxLength={2000}
          showCount
        />
      </Form.Item>

      <Form.Item
        name="images"
        label="相关图片"
      >
        <Upload {...uploadProps} multiple>
          <Button icon={<PlusOutlined />}>上传图片</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          size="large"
          className="submit-btn"
        >
          创建家族故事
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="create-page">
        <div className="page-header">
          <h1>创作中心</h1>
          <p>添加新的家族成员或记录家族故事</p>
        </div>

        <div className="create-type-selector">
          <Radio.Group 
            value={createType} 
            onChange={(e) => setCreateType(e.target.value)}
            size="large"
          >
            <Radio.Button value="member">
              <UserAddOutlined /> 添加成员
            </Radio.Button>
            <Radio.Button value="story">
              <FileTextOutlined /> 记录故事
            </Radio.Button>
          </Radio.Group>
        </div>

        <Card className="create-card">
          {createType === 'member' ? renderMemberForm() : renderStoryForm()}
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreatePage;

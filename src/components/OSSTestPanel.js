import React, { useState } from 'react';
import { Card, Button, Upload, message, Space, List, Typography, Tag, Progress } from 'antd';
import { UploadOutlined, DeleteOutlined, InfoCircleOutlined, LinkOutlined } from '@ant-design/icons';
import uploadService from '../services/uploadService';
import tenantService from '../services/tenantService';

const { Text, Paragraph } = Typography;

const OSSTestPanel = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileList, setFileList] = useState([]);

  // 检查OSS配置状态
  const ossConfigured = uploadService.isOSSConfigured();
  const currentTenant = tenantService.getCurrentTenant();

  // 自定义上传处理
  const handleUpload = async ({ file, onSuccess, onError, onProgress }) => {
    try {
      setUploading(true);
      
      const tenantId = currentTenant.id;
      const options = {
        onProgress: (index, percent, fileName) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: percent
          }));
          onProgress({ percent });
        }
      };

      const urls = await uploadService.uploadFiles([file], tenantId, options);
      
      if (urls && urls.length > 0) {
        const fileInfo = {
          name: file.name,
          url: urls[0],
          size: file.size,
          type: file.type,
          uploadTime: new Date().toISOString(),
        };
        
        setUploadedFiles(prev => [...prev, fileInfo]);
        onSuccess(urls[0]);
        message.success(`文件 ${file.name} 上传成功`);
      } else {
        throw new Error('上传失败，未返回URL');
      }
    } catch (error) {
      console.error('上传失败:', error);
      onError(error);
      message.error(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  };

  // 删除文件
  const handleDelete = async (fileInfo) => {
    try {
      // 从URL中提取objectKey
      const url = new URL(fileInfo.url);
      const objectKey = url.pathname.substring(1); // 去掉开头的 /
      
      const success = await uploadService.deleteOSSFile(objectKey);
      if (success) {
        setUploadedFiles(prev => prev.filter(f => f.url !== fileInfo.url));
        message.success('文件删除成功');
      } else {
        message.error('文件删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error(`删除失败: ${error.message}`);
    }
  };

  // 生成临时URL
  const generateTempUrl = async (fileInfo) => {
    try {
      const url = new URL(fileInfo.url);
      const objectKey = url.pathname.substring(1);
      
      const tempUrl = uploadService.generateTempUrl(objectKey, 3600);
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(tempUrl);
      message.success('临时URL已复制到剪贴板（有效期1小时）');
    } catch (error) {
      console.error('生成临时URL失败:', error);
      message.error(`生成临时URL失败: ${error.message}`);
    }
  };

  // 获取文件信息
  const getFileInfo = async (fileInfo) => {
    try {
      const url = new URL(fileInfo.url);
      const objectKey = url.pathname.substring(1);
      
      const info = await uploadService.getOSSFileInfo(objectKey);
      
      message.info(
        <div>
          <p><strong>文件信息:</strong></p>
          <p>大小: {(info.size / 1024).toFixed(2)} KB</p>
          <p>类型: {info.type}</p>
          <p>最后修改: {info.lastModified}</p>
          <p>ETag: {info.etag}</p>
        </div>,
        5
      );
    } catch (error) {
      console.error('获取文件信息失败:', error);
      message.error(`获取文件信息失败: ${error.message}`);
    }
  };

  return (
    <Card 
      title="阿里云OSS测试面板" 
      style={{ margin: '20px', maxWidth: '800px' }}
      extra={
        <Tag color={ossConfigured ? 'green' : 'orange'}>
          {ossConfigured ? 'OSS已配置' : 'OSS未配置'}
        </Tag>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 配置状态 */}
        <div>
          <Text strong>当前租户: </Text>
          <Tag color="blue">{currentTenant.name}</Tag>
          <br />
          <Text strong>OSS状态: </Text>
          {ossConfigured ? (
            <Text type="success">✅ 已配置，可以直接上传到阿里云OSS</Text>
          ) : (
            <Text type="warning">⚠️ 未配置，将使用模拟上传</Text>
          )}
        </div>

        {/* 上传区域 */}
        <Upload.Dragger
          name="file"
          multiple
          accept="image/*"
          customRequest={handleUpload}
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传图片文件，最大10MB
          </p>
        </Upload.Dragger>

        {/* 上传进度 */}
        {Object.keys(uploadProgress).length > 0 && (
          <div>
            <Text strong>上传进度:</Text>
            {Object.entries(uploadProgress).map(([fileName, percent]) => (
              <div key={fileName} style={{ marginTop: '8px' }}>
                <Text>{fileName}</Text>
                <Progress percent={percent} size="small" />
              </div>
            ))}
          </div>
        )}

        {/* 已上传文件列表 */}
        {uploadedFiles.length > 0 && (
          <div>
            <Text strong>已上传文件 ({uploadedFiles.length}):</Text>
            <List
              size="small"
              dataSource={uploadedFiles}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      icon={<InfoCircleOutlined />}
                      onClick={() => getFileInfo(item)}
                    >
                      信息
                    </Button>,
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => generateTempUrl(item)}
                    >
                      临时URL
                    </Button>,
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(item)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.name}
                      </a>
                    }
                    description={
                      <Space>
                        <Text type="secondary">
                          {(item.size / 1024).toFixed(2)} KB
                        </Text>
                        <Text type="secondary">
                          {new Date(item.uploadTime).toLocaleString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 使用说明 */}
        <div>
          <Text strong>使用说明:</Text>
          <Paragraph>
            <ul>
              <li>如果配置了阿里云OSS，文件将直接上传到OSS存储桶</li>
              <li>文件路径格式: family-tree/租户ID/时间戳_随机码_索引.扩展名</li>
              <li>支持生成临时访问URL（有效期1小时）</li>
              <li>可以查看文件详细信息和删除文件</li>
              <li>所有操作都会在控制台输出详细日志</li>
            </ul>
          </Paragraph>
        </div>
      </Space>
    </Card>
  );
};

export default OSSTestPanel;

# 生产环境手机号登录修复指南

## 问题描述
用户 `2246262252@qq.com` 可以通过邮箱登录，但使用手机号 `18167120075` 登录时提示"用户不存在"。

**根本原因**：注册时使用的 `PHONE_IDENTITY_SECRET`/`JWT_SECRET` 与当前生产环境不一致，导致 phone hash 不匹配。

## 修复方案

已创建临时修复接口：`POST /api/admin?type=fix-phone-identity`

### 方式一：通过 curl 调用（推荐）

#### 1. 本地测试
```bash
# 启动本地开发服务器
npm run dev

# 在另一个终端执行修复请求
curl -X POST http://localhost:3003/api/admin \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "18167120075",
    "email": "2246262252@qq.com"
  }'
```

#### 2. 部署到 Vercel 并在生产环境执行

```bash
# 1. 提交代码并部署到 Vercel
git add .
git commit -m "fix(auth): add temporary endpoint to fix phone login issue"
git push origin master

# 等待 Vercel 部署完成（约1-2分钟）

# 2. 获取你的生产环境域名，例如：https://your-app.vercel.app
# 执行修复请求
curl -X POST https://your-app.vercel.app/api/admin \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "18167120075",
    "email": "2246262252@qq.com"
  }'
```

### 方式二：通过浏览器开发者工具

1. 打开 WPS 应用（生产环境）
2. 打开浏览器开发者工具 (F12)
3. 切换到 Console 标签
4. 执行以下 JavaScript：

```javascript
fetch('/api/admin?type=fix-phone-identity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '18167120075',
    email: '2246262252@qq.com'
  })
})
.then(r => r.json())
.then(data => console.log('修复结果:', data))
.catch(err => console.error('错误:', err));
```

## 预期响应

### ✅ 成功响应
```json
{
  "success": true,
  "message": "修复成功，用户现在可以使用手机号登录",
  "data": {
    "userId": 11,
    "newIdentityId": "cmroxxg3d00015rh1ewq7q3de",
    "phoneMasked": "181****0075",
    "fixedAt": "2026-07-17T12:55:09.123Z",
    "environment": "production"
  }
}
```

### ⚠️ 已正确关联（无需修复）
```json
{
  "success": true,
  "message": "手机号已正确关联，无需修复",
  "data": {
    "userId": 11,
    "phoneIdentityId": "xxx",
    "cleanedUp": true
  }
}
```

### ❌ 错误响应示例
```json
{
  "success": false,
  "error": "未找到邮箱用户: xxx@xxx.com"
}
```

## 验证修复结果

修复完成后，让用户尝试：

1. **手机号登录**: 输入 `18167120075` + 密码 → 应该能成功登录
2. **邮箱登录**: 输入 `2246262252@qq.com` + 密码 → 应该仍然正常

## 清理工作（重要！⚠️）

修复成功后，**必须删除临时文件**以避免安全风险：

```bash
# 删除临时修复接口
rm lib/api-handlers/admin/fix-phone-identity.js

# 恢复 admin.js 原始状态
git checkout api/admin.js

# 提交清理
git add .
git commit -m "chore: remove temporary fix-phone-identity endpoint"
git push origin master
```

## 故障排查

### 问题 1: 404 Not Found
- **原因**: 路由未正确注册或部署未完成
- **解决**: 检查 Vercel 部署状态，确认 URL 正确

### 问题 2: 405 Method Not Allowed
- **原因**: 使用了 GET 而不是 POST
- **解决**: 确保 HTTP 方法为 POST

### 问题 3: 500 Internal Server Error
- **原因**: 数据库连接问题或权限不足
- **解决**: 检查 Vercel 环境变量配置（DATABASE_URL 等）

### 问题 4: 该手机号已关联到其他用户
- **原因**: 数据冲突，可能需要手动处理
- **解决**: 检查数据库中是否有重复的账号绑定

## 技术细节

### 修复原理
1. 使用**当前生产环境的 secret** 重新计算 phone hash
2. 在 `auth_identities` 表中创建新的 PHONE 类型记录
3. 关联到正确的用户 ID
4. 删除旧的、hash 不匹配的 PHONE 记录
5. 标记新记录为已验证状态 (`verified_at = NOW()`)

### 涉及的数据库表
- `users`: 用户主表
- `auth_identities`: 认证身份表（PHONE 和 EMAIL 类型）

### 为什么会出这个问题？
- 注册时：Secret_A → Hash_A → 存储到数据库
- Secret 变更：Secret_A ≠ Secret_B
- 登录时：Secret_B → Hash_B ≠ Hash_A → 查找不到 → "用户不存在"

---

**最后更新时间**: 2026-07-17  
**适用版本**: 所有使用了此认证系统的环境  
**风险等级**: 低（仅影响特定用户的手机号登录）
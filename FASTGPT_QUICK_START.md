# FastGPT 知识库接入 - 快速开始

## 一、配置环境变量

编辑 `OpenMAIC/.env.local`，添加：

```bash
FASTGPT_BASE_URL=http://10.15.40.245:3000
FASTGPT_API_KEY=你的FastGPT应用API密钥
```

## 二、测试连接（可选）

```bash
cd OpenMAIC
npx tsx scripts/test-fastgpt.ts
```

预期输出：
```
✅ FASTGPT_BASE_URL: http://10.15.40.245:3000
✅ FASTGPT_API_KEY: a61159bfaa...
✅ Query successful!
Answer:
---
毛泽东思想的活的灵魂包括：
1. 实事求是
2. 群众路线
3. 独立自主
---
```

## 三、使用知识库增强

1. 启动开发服务器：
   ```bash
   cd OpenMAIC
   npm run dev
   ```

2. 访问测试页面：
   ```
   http://localhost:3000/teaching-test
   ```

3. 填写教学信息：
   - 学科：思想政治
   - 课题：毛泽东思想的活的灵魂
   - 年级：高一
   - 课时：45

4. ✅ **勾选"使用知识库增强（FastGPT）"**

5. 点击"生成教学设计"

## 四、查看效果

生成的教学设计会包含知识库内容：

### 不使用知识库
- 教学重点：较为通用
- 教学过程：基于常规教学经验

### 使用知识库
- 教学重点：包含知识库中的具体知识点（如"实事求是、群众路线、独立自主"）
- 教学过程：融入知识库提供的讲解要点和案例

## 五、故障排查

### 问题：环境变量不生效
- 确认修改的是 `.env.local` 而不是 `.env.example`
- 重启开发服务器（Ctrl+C 后重新 `npm run dev`）

### 问题：FastGPT 调用失败
- 检查网络：`curl http://10.15.40.245:3000`
- 检查 API Key 是否正确
- 查看浏览器控制台或服务端日志

### 问题：生成内容没有知识库增强
- 确认勾选了"使用知识库增强"复选框
- 查看服务端日志，确认有 "FastGPT query successful"

## 六、技术说明

### 调用流程
```
测试页面勾选知识库
  ↓
useTeachingGenerator.generate()
  ↓
POST /api/generate/teaching-outline
  ↓
generateTeachingDesignFromRequest()
  ↓
queryFastGPT() [服务端]
  ↓
FastGPT API
  ↓
返回知识库内容
  ↓
注入到教学设计 prompt
  ↓
生成增强版 TeachingDesign
```

### 降级策略
- FastGPT 不可用 → 自动降级，继续生成（不使用知识库）
- FastGPT 超时 → 自动降级，继续生成
- 环境变量未配置 → 明确报错，提示配置

### 安全性
- ✅ API Key 只在服务端使用
- ✅ 不会在日志中打印密钥
- ✅ 客户端无法直接访问 FastGPT

## 七、下一步

完成测试后，可以：
1. 使用真实教学场景测试
2. 调整知识库查询策略
3. 优化 prompt 注入位置
4. 添加引用展示功能

详细文档请参考：`FASTGPT_INTEGRATION_GUIDE.md`

# 语音输入功能使用指南

## 功能说明

在教学设计意图页面（`http://localhost:3000/teaching-design/intent`）中，现在支持通过语音输入教学需求。

## 使用步骤

### 1. 配置语音识别服务

在 `.env.local` 文件中添加通义千问语音识别配置：

```env
# ASR (Automatic Speech Recognition)
ASR_QWEN_API_KEY=your_qwen_api_key_here
ASR_QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

### 2. 使用语音输入

1. 打开教学设计意图页面
2. 点击输入框右侧的"语音输入"按钮（带麦克风图标）
3. 浏览器会请求麦克风权限，点击"允许"
4. 开始说话，按钮会显示"停止录音"并带有脉冲动画
5. 说完后再次点击按钮停止录音
6. 系统会自动将语音转换为文字并填入输入框
7. 检查识别结果，如需修改可手动编辑
8. 点击"发送"按钮提交

## 功能特点

- **实时录音**：点击即开始录音，再次点击停止
- **自动识别**：录音结束后自动调用语音识别服务
- **智能填充**：识别结果自动填入输入框
- **错误提示**：如果识别失败会显示错误信息
- **状态反馈**：
  - 录音中：按钮显示红色背景和脉冲动画
  - 识别中：显示加载动画
  - 完成后：文字自动填入输入框

## 支持的语音识别服务

当前实现支持通义千问（Qwen）语音识别服务：

- **模型**：paraformer-v2
- **支持格式**：webm（浏览器录音格式）
- **识别语言**：中文

## 技术实现

### 核心文件

1. **Hook**: `OpenMAIC/lib/hooks/use-voice-recorder.ts`
   - 封装录音和转录逻辑
   - 管理录音状态
   - 处理错误

2. **API**: `OpenMAIC/app/api/transcribe/route.ts`
   - 接收音频文件
   - 调用通义千问 ASR API
   - 返回识别文本

3. **组件**: `OpenMAIC/components/teaching-design/intent/IntentConversationPanel.tsx`
   - 集成语音录制 hook
   - 显示录音状态
   - 处理识别结果

### 工作流程

```
用户点击"语音输入"
  ↓
请求麦克风权限
  ↓
开始录音（MediaRecorder API）
  ↓
用户再次点击停止
  ↓
生成音频 Blob
  ↓
上传到 /api/transcribe
  ↓
调用通义千问 ASR API
  ↓
返回识别文本
  ↓
自动填入输入框
```

## 常见问题

### 1. 麦克风权限被拒绝

**问题**：浏览器提示"无法访问麦克风"

**解决**：
- 检查浏览器设置，允许网站访问麦克风
- Chrome: 设置 → 隐私和安全 → 网站设置 → 麦克风
- 确保使用 HTTPS 或 localhost（HTTP 可能无法访问麦克风）

### 2. 语音识别失败

**问题**：显示"语音识别失败"

**解决**：
- 检查 `.env.local` 中的 `ASR_QWEN_API_KEY` 是否正确
- 确认通义千问 API 配额是否充足
- 查看服务器日志获取详细错误信息

### 3. 未识别到语音内容

**问题**：录音后显示"未识别到语音内容"

**解决**：
- 确保录音时有清晰的语音输入
- 检查麦克风是否正常工作
- 尝试说话更清晰或更大声

### 4. 识别结果不准确

**问题**：识别的文字与说话内容不符

**解决**：
- 说话时尽量清晰、标准
- 避免环境噪音干扰
- 可以手动修改识别结果后再发送

## 扩展支持

如需支持其他语音识别服务（如 OpenAI Whisper），可以修改 `/api/transcribe/route.ts`：

```typescript
// 示例：添加 OpenAI Whisper 支持
const openaiApiKey = process.env.ASR_OPENAI_API_KEY;
if (openaiApiKey) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });
  
  const result = await response.json();
  return NextResponse.json({ text: result.text });
}
```

## 总结

语音输入功能已完全集成到教学设计意图页面，教师可以通过语音快速输入教学需求，提高输入效率。系统会自动将语音转换为文字，支持后续编辑和提交。

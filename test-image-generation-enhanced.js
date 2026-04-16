/**
 * 图片生成 API 增强测试脚本
 * 
 * 功能：
 * 1. 调用图片生成 API
 * 2. 下载生成的图片到本地
 * 3. 创建 HTML 预览页面
 * 
 * 使用方法：
 * node test-image-generation-enhanced.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImageGeneration() {
  console.log('🎨 开始测试图片生成 API...\n');

  const testConfig = {
    url: 'http://localhost:3000/api/generate/image',
    headers: {
      'Content-Type': 'application/json',
      'x-image-provider': 'qwen-image',
      'x-image-model': 'qwen-image-plus',
    },
    body: {
      prompt: 'A colorful diagram showing binary tree traversal methods including preorder, inorder, and postorder, with clear arrows and labels, educational style',
      aspectRatio: '16:9',
    }
  };

  console.log('📋 测试配置:');
  console.log('  URL:', testConfig.url);
  console.log('  Provider:', testConfig.headers['x-image-provider']);
  console.log('  Model:', testConfig.headers['x-image-model']);
  console.log('  Prompt:', testConfig.body.prompt);
  console.log('  Aspect Ratio:', testConfig.body.aspectRatio);
  console.log('\n⏳ 正在调用 API（可能需要 10-30 秒）...\n');

  const startTime = Date.now();

  try {
    // Step 1: 调用图片生成 API
    const response = await fetch(testConfig.url, {
      method: 'POST',
      headers: testConfig.headers,
      body: JSON.stringify(testConfig.body)
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API 调用失败:');
      console.error('  状态码:', response.status);
      console.error('  错误信息:', JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    
    console.log(`✅ API 调用成功 (耗时: ${elapsed}s)\n`);

    if (!data.success || !data.result || !data.result.url) {
      console.error('❌ 响应数据格式错误:', data);
      return;
    }

    const imageUrl = data.result.url;
    const width = data.result.width || 'N/A';
    const height = data.result.height || 'N/A';

    console.log('🎉 图片生成成功！');
    console.log('  图片 URL:', imageUrl);
    console.log('  宽度:', width);
    console.log('  高度:', height);

    // Step 2: 下载图片
    console.log('\n📥 正在下载图片...');
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error('❌ 图片下载失败:', imageResponse.status, imageResponse.statusText);
      console.log('\n💡 提示: OSS URL 可能有访问限制或已过期');
      console.log('   但这不影响实际使用，因为系统会将图片存储到 IndexedDB');
      return;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const outputDir = path.join(__dirname, 'test-output');
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存图片
    const timestamp = Date.now();
    const imagePath = path.join(outputDir, `generated-image-${timestamp}.png`);
    fs.writeFileSync(imagePath, imageBuffer);
    
    console.log(`✅ 图片已保存到: ${imagePath}`);

    // Step 3: 创建 HTML 预览页面
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图片生成测试结果</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .info-item {
      margin: 8px 0;
      display: flex;
      gap: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      min-width: 120px;
    }
    .info-value {
      color: #333;
      word-break: break-all;
    }
    .image-container {
      margin: 30px 0;
      text-align: center;
    }
    .image-container img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .success {
      color: #4CAF50;
      font-size: 24px;
      margin: 20px 0;
    }
    .timestamp {
      color: #999;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 图片生成测试结果</h1>
    
    <div class="success">✅ 测试成功！</div>
    
    <div class="info">
      <div class="info-item">
        <span class="info-label">提供商:</span>
        <span class="info-value">${testConfig.headers['x-image-provider']}</span>
      </div>
      <div class="info-item">
        <span class="info-label">模型:</span>
        <span class="info-value">${testConfig.headers['x-image-model']}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Prompt:</span>
        <span class="info-value">${testConfig.body.prompt}</span>
      </div>
      <div class="info-item">
        <span class="info-label">宽高比:</span>
        <span class="info-value">${testConfig.body.aspectRatio}</span>
      </div>
      <div class="info-item">
        <span class="info-label">图片尺寸:</span>
        <span class="info-value">${width} × ${height}</span>
      </div>
      <div class="info-item">
        <span class="info-label">生成耗时:</span>
        <span class="info-value">${elapsed}s</span>
      </div>
      <div class="info-item">
        <span class="info-label">原始 URL:</span>
        <span class="info-value">${imageUrl}</span>
      </div>
    </div>
    
    <div class="image-container">
      <h2>生成的图片</h2>
      <img src="generated-image-${timestamp}.png" alt="Generated Image">
    </div>
    
    <div class="timestamp">
      测试时间: ${new Date().toLocaleString('zh-CN')}
    </div>
  </div>
</body>
</html>`;

    const htmlPath = path.join(outputDir, `preview-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log(`✅ 预览页面已创建: ${htmlPath}`);
    console.log('\n🌐 在浏览器中打开预览页面查看生成的图片');
    console.log(`   file:///${htmlPath.replace(/\\/g, '/')}`);

    // 总结
    console.log('\n📊 测试总结:');
    console.log('  ✅ API 调用成功');
    console.log('  ✅ 图片生成成功');
    console.log('  ✅ 图片下载成功');
    console.log('  ✅ 预览页面创建成功');
    console.log('\n🎉 图片生成功能验证通过！');

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ 测试失败 (耗时: ${elapsed}s):`, error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 提示: 请确保开发服务器正在运行');
      console.error('   运行命令: cd OpenMAIC && npm run dev');
    }
  }
}

// 运行测试
testImageGeneration();

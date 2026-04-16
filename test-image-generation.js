/**
 * 图片生成 API 测试脚本
 * 
 * 使用方法：
 * node test-image-generation.js
 */

async function testImageGeneration() {
  console.log('🎨 开始测试图片生成 API...\n');

  const testConfig = {
    url: 'http://localhost:3000/api/generate/image',
    headers: {
      'Content-Type': 'application/json',
      'x-image-provider': 'qwen-image',
      'x-image-model': 'qwen-image-plus',
      // API Key 会从服务器端的 .env.local 读取，不需要在这里传递
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
    console.log('📊 响应数据:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.result) {
      console.log('\n🎉 图片生成成功！');
      console.log('  图片 URL:', data.result.url);
      console.log('  宽度:', data.result.width || 'N/A');
      console.log('  高度:', data.result.height || 'N/A');
      console.log('\n💡 提示: 你可以在浏览器中打开这个 URL 查看生成的图片');
    }

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ 请求失败 (耗时: ${elapsed}s):`, error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 提示: 请确保开发服务器正在运行');
      console.error('   运行命令: cd OpenMAIC && npm run dev');
    }
  }
}

// 运行测试
testImageGeneration();

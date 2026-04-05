# Chroma 向量数据库使用指南

## 当前状态

你正在下载 Chroma Docker 镜像。这是第一次运行时的正常过程。

## 等待下载完成

### 下载进度
你会看到类似这样的输出：
```
latest: Pulling from chromadb/chroma
abc123: Downloading [==>                ] 10.5MB/50MB
def456: Downloading [=====>             ] 25MB/100MB
...
```

### 下载完成标志
当看到这样的输出时，说明下载完成：
```
Status: Downloaded newer image for chromadb/chroma:latest
<一串容器ID>
```

## 验证 Chroma 是否运行

### 方法 1：使用脚本（推荐）

```bash
# 检查 Chroma 状态
scripts\check-chroma.bat
```

### 方法 2：手动检查

```bash
# 查看容器状态
docker ps

# 应该看到类似输出：
# CONTAINER ID   IMAGE             STATUS         PORTS                    NAMES
# abc123def456   chromadb/chroma   Up 2 minutes   0.0.0.0:8000->8000/tcp   openmaic-chroma
```

### 方法 3：测试 API

在浏览器中访问：http://localhost:8000/api/v1/heartbeat

应该看到 JSON 响应：
```json
{"nanosecond heartbeat": 1234567890}
```

## 常用操作

### 启动 Chroma

```bash
# 使用脚本
scripts\start-chroma.bat

# 或手动启动
docker start openmaic-chroma
```

### 停止 Chroma

```bash
# 使用脚本
scripts\stop-chroma.bat

# 或手动停止
docker stop openmaic-chroma
```

### 重启 Chroma

```bash
docker restart openmaic-chroma
```

### 查看日志

```bash
# 查看最近的日志
docker logs openmaic-chroma

# 实时查看日志
docker logs -f openmaic-chroma
```

### 删除容器（重新开始）

```bash
# 停止并删除容器
docker stop openmaic-chroma
docker rm openmaic-chroma

# 重新创建
docker run -d -p 8000:8000 --name openmaic-chroma chromadb/chroma
```

## 集成到项目

### 1. 确认 Chroma 正在运行

```bash
scripts\check-chroma.bat
```

### 2. 配置环境变量

在 `.env.local` 中添加（如果还没有）：
```env
CHROMA_URL=http://localhost:8000
```

### 3. 测试连接

创建测试脚本 `scripts/test-rag.ts`：

```typescript
import { createVectorStore } from '@/lib/rag/vector-store';
import { createEmbeddings } from '@/lib/rag/embeddings';

async function testChroma() {
  console.log('测试 Chroma 连接...');
  
  try {
    const embeddings = createEmbeddings({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = await createVectorStore({
      collectionName: 'test-collection',
      chromaUrl: 'http://localhost:8000',
      embeddings,
    });

    console.log('✅ Chroma 连接成功！');
    
    // 测试添加文档
    await vectorStore.addDocuments([
      { pageContent: '这是一个测试文档', metadata: { source: 'test' } }
    ]);
    
    console.log('✅ 文档添加成功！');
    
    // 测试检索
    const results = await vectorStore.similaritySearch('测试', 1);
    console.log('✅ 检索成功！', results);
    
  } catch (error) {
    console.error('❌ 测试失败：', error);
  }
}

testChroma();
```

运行测试：
```bash
pnpm tsx scripts/test-rag.ts
```

## 数据持久化

### 当前配置
默认情况下，Chroma 数据存储在容器内部。如果删除容器，数据会丢失。

### 持久化配置（推荐）

如果需要持久化数据，使用数据卷：

```bash
# 停止并删除旧容器
docker stop openmaic-chroma
docker rm openmaic-chroma

# 创建带数据卷的新容器
docker run -d -p 8000:8000 \
  --name openmaic-chroma \
  -v D:/openmaic/OpenMAIC/data/chroma:/chroma/chroma \
  chromadb/chroma
```

Windows PowerShell 版本：
```powershell
docker run -d -p 8000:8000 `
  --name openmaic-chroma `
  -v D:/openmaic/OpenMAIC/data/chroma:/chroma/chroma `
  chromadb/chroma
```

这样数据会保存在 `D:/openmaic/OpenMAIC/data/chroma` 目录。

## 常见问题

### Q1: 端口 8000 被占用

**错误信息**：
```
Error: bind: address already in use
```

**解决方案**：
```bash
# 查看占用端口的进程
netstat -ano | findstr :8000

# 关闭进程或使用其他端口
docker run -d -p 8001:8000 --name openmaic-chroma chromadb/chroma
```

如果使用其他端口，记得更新 `.env.local`：
```env
CHROMA_URL=http://localhost:8001
```

### Q2: 容器启动失败

**检查日志**：
```bash
docker logs openmaic-chroma
```

**常见原因**：
1. Docker Desktop 未启动
2. 内存不足
3. 端口冲突

### Q3: 连接超时

**错误信息**：
```
Error: connect ETIMEDOUT
```

**解决方案**：
1. 确认容器正在运行：`docker ps`
2. 确认端口映射正确：`docker port openmaic-chroma`
3. 检查防火墙设置
4. 尝试重启容器：`docker restart openmaic-chroma`

### Q4: 数据丢失

**原因**：
容器被删除时，内部数据会丢失。

**解决方案**：
使用数据卷持久化（见上文"数据持久化"部分）。

## 性能优化

### 内存限制

如果系统内存有限，可以限制 Chroma 使用的内存：

```bash
docker run -d -p 8000:8000 \
  --name openmaic-chroma \
  --memory="2g" \
  chromadb/chroma
```

### 清理旧数据

如果数据库变大，可以清理不需要的集合：

```typescript
// 在代码中删除集合
await vectorStore.deleteCollection();
```

或者重新创建容器：
```bash
docker stop openmaic-chroma
docker rm openmaic-chroma
docker run -d -p 8000:8000 --name openmaic-chroma chromadb/chroma
```

## 开发工作流

### 日常使用

1. **启动 Docker Desktop**
2. **启动 Chroma**：`scripts\start-chroma.bat`
3. **启动项目**：`pnpm dev`
4. **开发和测试**
5. **停止 Chroma**（可选）：`scripts\stop-chroma.bat`

### 自动启动（可选）

如果希望 Chroma 随 Docker Desktop 自动启动：

```bash
docker update --restart=always openmaic-chroma
```

取消自动启动：
```bash
docker update --restart=no openmaic-chroma
```

## 监控和调试

### 查看资源使用

```bash
docker stats openmaic-chroma
```

### 进入容器

```bash
docker exec -it openmaic-chroma /bin/bash
```

### 查看 Chroma 版本

```bash
docker exec openmaic-chroma chroma --version
```

## 备份和恢复

### 备份数据

如果使用了数据卷：
```bash
# 复制数据目录
xcopy D:\openmaic\OpenMAIC\data\chroma D:\backup\chroma /E /I
```

### 恢复数据

```bash
# 停止容器
docker stop openmaic-chroma

# 恢复数据
xcopy D:\backup\chroma D:\openmaic\OpenMAIC\data\chroma /E /I

# 启动容器
docker start openmaic-chroma
```

## 下一步

### Chroma 启动成功后

1. ✅ 运行测试脚本验证连接
2. 准备知识库资料（放入 `data/knowledge-base/documents/`）
3. 运行向量化脚本
4. 测试 RAG 检索功能

### 开始使用 RAG

参考文档：
- [二次开发方案.md](./二次开发方案.md) - RAG 系统设计
- [快速开始指南.md](./快速开始指南.md) - RAG 使用示例

---

**提示**：Chroma 下载完成后，容器会自动启动。你可以运行 `scripts\check-chroma.bat` 验证状态。

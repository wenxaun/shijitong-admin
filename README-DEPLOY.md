# 腾讯云部署相关文件说明

本目录包含腾讯云部署所需的所有文件和文档。

## 文件清单

### 配置文件

- **`.env.tencent.template`** - 腾讯云部署配置模板
  - 复制为 `.env.tencent` 并填写真实值
  - 包含镜像仓库、云开发、API密钥等配置

- **`.dockerignore`** - Docker构建忽略文件
  - 指定哪些文件不包含在Docker镜像中
  - 减小镜像体积，加快构建速度

- **`Dockerfile`** - 后端Docker镜像构建文件
  - 定义后端服务的运行环境
  - 用于腾讯云云托管部署

### 脚本文件

- **`deploy-tencent-cloud.sh`** - 自动化部署脚本
  - 自动构建Docker镜像并推送
  - 自动构建并部署Web UI管理后台
  - 需要配置 `.env.tencent` 文件

### 文档文件

- **`tencent-cloud-deployment-guide.md`** - 完整的腾讯云部署指南
  - 详细的部署步骤
  - 架构说明
  - 配置指南
  - 常见问题解答

- **`QUICKSTART.md`** - 5分钟快速开始指南
  - 简化的部署流程
  - 常见问题快速解决

- **`web-admin-deployment-guide.md`** - Web UI管理后台部署指南
  - 管理后台部署说明
  - API接口文档
  - 安全建议

## 快速开始

### 1. 配置部署参数

```bash
# 复制配置模板
cp .env.tencent.template .env.tencent

# 编辑配置文件（填写必填项）
nano .env.tencent
```

### 2. 执行部署

```bash
# 赋予脚本执行权限
chmod +x deploy-tencent-cloud.sh

# 运行部署脚本
./deploy-tencent-cloud.sh
```

### 3. 在腾讯云控制台配置后端服务

详见 `QUICKSTART.md` 或 `tencent-cloud-deployment-guide.md`

## 部署流程图

```
1. 配置 .env.tencent
       ↓
2. 运行 deploy-tencent-cloud.sh
       ↓
3. Docker镜像构建并推送
       ↓
4. Web UI构建并部署
       ↓
5. 在云托管控制台创建服务
       ↓
6. 配置环境变量和访问地址
       ↓
7. 创建管理员账户
       ↓
8. 访问管理后台
```

## 需要准备的腾讯云资源

### 必备资源

1. **腾讯云账号** - 已开通腾讯云服务
2. **容器镜像服务命名空间** - 用于存放Docker镜像
3. **云开发环境ID** - 用于数据库和静态网站托管
4. **API密钥** - 用于后端访问云开发数据库

### 可选资源

1. **自定义域名** - 用于访问管理后台和后端API
2. **SSL证书** - 腾讯云自动提供，无需手动配置
3. **CDN加速** - 自动配置，无需手动操作

## 成本估算

| 项目 | 规格 | 月费用 |
|------|------|--------|
| 云托管（后端） | 1核2G | ¥5.76 |
| 静态网站托管 | 5GB存储 | 免费 |
| 云开发数据库 | 2GB容量 | 免费 |
| 流量 | 5GB/月 | 免费 |
| **总计** | | **约 ¥6/月** |

## 注意事项

1. **安全配置**
   - 修改默认的JWT密钥
   - 使用强密码作为管理员密码
   - 不要将 `.env.tencent` 提交到代码仓库

2. **域名配置**
   - 生产环境建议使用自定义域名
   - HTTPS证书自动配置，无需手动操作
   - DNS解析可能需要几分钟到几小时生效

3. **资源监控**
   - 定期查看云托管日志
   - 监控CPU和内存使用率
   - 配置自动扩缩容规则

4. **数据备份**
   - 云开发数据库自动备份
   - 建议定期导出重要数据

## 文档导航

- 📖 [完整部署指南](tencent-cloud-deployment-guide.md) - 详细的部署文档
- 🚀 [快速开始](QUICKSTART.md) - 5分钟快速部署
- 🎨 [管理后台部署](web-admin-deployment-guide.md) - Web UI部署说明
- 📦 [Web UI README](web-admin/README.md) - 管理后台项目文档

## 常见问题

### Q: 如何获取腾讯云相关配置？

A: 查看 `QUICKSTART.md` 的"第一步：获取腾讯云账号信息"章节。

### Q: 部署脚本失败怎么办？

A: 查看 `tencent-cloud-deployment-guide.md` 的"常见问题"章节。

### Q: 如何更新后端代码？

A: 修改代码后，重新运行 `./deploy-tencent-cloud.sh`，然后在云托管控制台创建新版本。

### Q: 如何更新管理后台？

A: 修改代码后，运行：

```bash
cd web-admin
npm run build
cloudbase hosting:deploy dist -e 你的云开发环境ID
```

## 技术支持

如遇到问题，请：

1. 查阅相关文档
2. 检查云托管和云开发的日志
3. 联系腾讯云技术支持
4. 在项目Issues中提问

## 许可证

本项目遵循 MIT 许可证。

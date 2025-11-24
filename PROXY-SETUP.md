# 🔧 代理配置完整指南

## 问题分析

从日志看到：`⚠️ No proxy configured` - 这说明 Raycast 扩展没有读取到代理配置。

## ✅ 完整配置步骤

### 第 1 步：完全退出并重启 Raycast

**重要！** Raycast 需要完全重启才能加载新的配置选项。

```bash
# 在终端执行
killall Raycast
sleep 2
open -a Raycast
```

或者：
1. 点击菜单栏的 Raycast 图标
2. 选择 "Quit Raycast"
3. 重新打开 Raycast

### 第 2 步：打开扩展设置

1. 按 `⌘ + ,` 打开 Raycast 设置
2. 左侧选择 **Extensions**
3. 找到 **Poe-talk** 扩展
4. 点击它

### 第 3 步：配置所有必需字段

你应该看到这些字段：

#### 1. **Poe API Key** (必填)
```
获取地址: https://poe.com/api_key
格式: pk_xxxxxxxxxxxxxxx...
```

#### 2. **Bot Name** (必填)
```
推荐: Gemini-3-Pro
或: Claude-Sonnet-4.5, GPT-5, Grok-4
```

#### 3. **Proxy URL** (新增！必填如果需要翻墙)
```
http://127.0.0.1:7890
```
**这个字段如果看不到，说明 Raycast 没有重启成功！**

#### 4. **Referer URL** (可选)
```
留空即可
```

#### 5. **App Title** (可选)
```
留空即可
```

### 第 4 步：保存并测试

1. 保存设置（Raycast 会自动保存）
2. 关闭设置窗口
3. 按 `⌘ + Space` 打开 Raycast
4. 输入 **"Test Poe Connection"**
5. 运行测试命令

### 第 5 步：查看日志

测试时，查看开发终端的日志输出：

**成功的日志应该显示：**
```
🔗 Using proxy: http://127.0.0.1:7890
🔧 测试配置:
  Bot: Gemini-3-Pro
  Proxy: http://127.0.0.1:7890
  API Key: 已配置 (pk_xxxxxxx...)
📤 发送测试消息...
📥 收到响应: 成功
```

**失败的日志会显示：**
```
⚠️ No proxy configured - this may cause timeout if you need VPN/proxy
```

## 🐛 故障排查

### 问题 1: 看不到 "Proxy URL" 选项

**原因：** Raycast 没有完全重启

**解决：**
```bash
# 强制重启 Raycast
killall -9 Raycast
rm -rf ~/Library/Caches/com.raycast.macos/*
open -a Raycast
```

### 问题 2: 配置了代理但日志显示 "No proxy configured"

**原因：** 配置没有被读取

**解决：**
1. 检查 Proxy URL 字段是否真的填入了 `http://127.0.0.1:7890`
2. 确保没有多余的空格
3. 重启 Raycast
4. 重新运行扩展

### 问题 3: 仍然超时

**可能原因：**
1. Clash/代理软件没有运行
2. 代理端口不是 7890
3. API Key 无效

**检查代理：**
```bash
# 运行检测脚本
cd /Users/intelheartprime/MyProjects/poe-raycast/poe-talk
./detect-proxy.sh
```

**手动测试代理：**
```bash
# 测试代理连接
curl -x http://127.0.0.1:7890 https://api.poe.com/v1/models

# 如果失败，尝试不同端口
curl -x http://127.0.0.1:1087 https://api.poe.com/v1/models
curl -x http://127.0.0.1:7891 https://api.poe.com/v1/models
```

### 问题 4: API Key 无效

**检查：**
1. 访问 https://poe.com/api_key
2. 重新生成一个新的 API Key
3. 复制时确保没有复制到多余字符
4. 在 Raycast 设置中更新

## 📋 快速检查清单

- [ ] Raycast 已完全重启
- [ ] 在扩展设置中看到 "Proxy URL" 选项
- [ ] Proxy URL 填入 `http://127.0.0.1:7890`
- [ ] API Key 正确配置（以 pk_ 开头）
- [ ] Bot Name 设置为 `Gemini-3-Pro` 或其他有效 bot
- [ ] Clash/代理软件正在运行
- [ ] 端口 7890 正在监听（运行 `lsof -i :7890`）
- [ ] 运行 "Test Poe Connection" 查看结果
- [ ] 查看开发终端日志确认代理被使用

## 🎯 预期结果

配置成功后，当你运行任何命令时：

1. **开发终端会显示：**
   ```
   🔗 Using proxy: http://127.0.0.1:7890
   ```

2. **测试连接会显示：**
   ```
   ✅ 连接成功
   Bot: Gemini-3-Pro (使用代理)
   ```

3. **可以正常对话：**
   - "Chat with Poe AI" 会打开对话窗口
   - 发送消息会得到实时回复
   - 没有超时错误

## 💡 额外提示

### 如果你使用 ClashX

1. 打开 ClashX
2. 确保是 "规则模式" 或 "全局模式"
3. 查看 "设置" → "端口"，确认 HTTP 端口是 7890

### 如果你使用 V2RayU

代理地址应该改为：
```
http://127.0.0.1:1087
```

### 环境变量方式（备选）

如果不想在 Raycast 设置中配置，可以设置环境变量：

在 `~/.zshrc` 添加：
```bash
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
```

然后重启终端和 Raycast。

## 🆘 还是不行？

如果以上所有步骤都试过了还是不行，请提供：

1. 运行 `./detect-proxy.sh` 的完整输出
2. 运行 "Test Poe Connection" 后的终端日志
3. 你的代理软件名称和端口
4. Raycast 设置的截图

我会根据这些信息进一步诊断。

# Timeout 问题排查指南

## 问题描述
连接 Poe API 时出现 "Request timed out" 错误。

## 可能的原因和解决方案

### 1. API Key 配置问题

**检查步骤：**
```bash
# 确认你的 API Key 是否正确
# 访问 https://poe.com/api_key
# 确保复制的 key 没有多余的空格或换行符
```

**在 Raycast 中检查：**
1. 打开 Raycast 设置 (⌘ + ,)
2. Extensions → Poe Talk
3. 检查 "Poe API Key" 字段
4. 确保没有前导/尾随空格

### 2. 网络连接问题

**测试网络连接：**
```bash
# 测试能否访问 Poe API
curl -v https://api.poe.com/v1/

# 如果使用代理，可能需要配置
export HTTP_PROXY=your_proxy
export HTTPS_PROXY=your_proxy
```

**常见原因：**
- 公司网络/防火墙阻止
- VPN 干扰
- 代理设置问题
- DNS 解析问题

### 3. Bot 名称问题

**确认 Bot 名称正确：**
常用的 Bot 名称（区分大小写）：
- `Claude-Sonnet-4.5` ✅
- `Claude-Opus-4.1` ✅
- `GPT-5` ✅
- `GPT-4o` ✅
- `Grok-4` ✅

**错误示例：**
- `claude-sonnet-4.5` ❌ (小写)
- `Claude Sonnet 4.5` ❌ (包含空格)
- `ClaudeSonnet45` ❌ (格式错误)

### 4. API Key 权限问题

**检查账户状态：**
1. 访问 https://poe.com/settings
2. 确认账户状态正常
3. 检查是否有可用积分
4. 确认 API 访问权限已启用

### 5. 超时设置

当前超时设置：120 秒

如果网络较慢，可以尝试增加超时：

编辑 `src/utils/poe-client.ts`:
```typescript
this.client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: "https://api.poe.com/v1",
  defaultHeaders: headers,
  timeout: 300000, // 改为 300 秒 (5 分钟)
  maxRetries: 3,   // 增加重试次数
});
```

### 6. 测试连接

使用新增的测试命令：
1. 打开 Raycast
2. 输入 "Test Poe Connection"
3. 查看详细错误信息

### 7. 使用 curl 直接测试

```bash
# 替换 YOUR_API_KEY 为你的真实 API key
curl -X POST "https://api.poe.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "Claude-Sonnet-4.5",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  }'
```

**期望输出：**
```json
{
  "id": "...",
  "object": "chat.completion",
  "created": ...,
  "model": "Claude-Sonnet-4.5",
  "choices": [...]
}
```

**如果失败：**
- 401: API Key 无效
- 402: 积分不足
- 429: 请求过于频繁
- 500: Poe 服务器错误
- Timeout: 网络连接问题

### 8. 检查系统代理设置

**macOS:**
```bash
# 检查系统代理
scutil --proxy

# 临时禁用代理测试
unset HTTP_PROXY
unset HTTPS_PROXY
unset ALL_PROXY
```

### 9. DNS 问题

```bash
# 测试 DNS 解析
nslookup api.poe.com

# 尝试刷新 DNS 缓存
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### 10. 防火墙设置

**检查 macOS 防火墙：**
1. 系统设置 → 网络 → 防火墙
2. 确保 Raycast 被允许接收传入连接
3. 尝试临时禁用防火墙测试

## 常见解决方案

### 快速修复步骤：

1. **重新生成 API Key**
   - 访问 https://poe.com/api_key
   - 点击 "Regenerate API Key"
   - 复制新 key（确保没有空格）
   - 更新 Raycast 设置

2. **切换网络**
   - 尝试切换到手机热点
   - 或者尝试不同的 WiFi 网络
   - 排除网络限制问题

3. **重启 Raycast**
   ```bash
   killall Raycast
   open -a Raycast
   ```

4. **清除 Raycast 缓存**
   ```bash
   rm -rf ~/Library/Caches/com.raycast.macos
   ```

5. **检查 Poe 服务状态**
   - 访问 https://poe.com/
   - 确认服务正常运行
   - 检查是否有维护公告

## 仍然无法解决？

### 收集诊断信息：

```bash
# 运行完整诊断
echo "=== Network Test ==="
ping -c 3 api.poe.com

echo "\n=== DNS Resolution ==="
nslookup api.poe.com

echo "\n=== HTTP Test ==="
curl -v https://api.poe.com/v1/ 2>&1 | head -20

echo "\n=== Proxy Settings ==="
scutil --proxy

echo "\n=== Raycast Version ==="
defaults read ~/Library/Preferences/com.raycast.macos.plist version
```

### 替代方案：

如果 Poe API 连接持续有问题，可以考虑：
1. 使用其他 AI API (OpenAI, Anthropic 直连)
2. 检查是否需要企业/订阅账户
3. 联系 Poe 支持团队

## 获取帮助

- Poe 文档: https://creator.poe.com/docs
- Poe 支持: support@poe.com
- 检查 Poe Status: https://status.poe.com/ (如果有的话)

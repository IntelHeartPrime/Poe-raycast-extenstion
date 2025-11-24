#!/bin/bash

echo "🔍 Raycast 扩展代理检测工具"
echo "=============================="
echo ""

# 检查系统代理设置
echo "📡 系统代理设置:"
scutil --proxy | grep -E "(HTTPEnable|HTTPProxy|HTTPPort|HTTPSEnable|HTTPSProxy|HTTPSPort)"
echo ""

# 检查环境变量
echo "🌍 环境变量代理设置:"
echo "HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo "http_proxy: ${http_proxy:-未设置}"
echo "https_proxy: ${https_proxy:-未设置}"
echo "ALL_PROXY: ${ALL_PROXY:-未设置}"
echo ""

# 常见代理端口检测
echo "🔌 检测常见代理端口:"
for port in 1087 7890 8888 1080 7891; do
  if lsof -i :"$port" > /dev/null 2>&1; then
    echo "  ✅ 端口 $port 正在使用"
    lsof -i :"$port" | grep LISTEN | awk '{print "     进程: " $1 " (PID: " $2 ")"}'
  else
    echo "  ❌ 端口 $port 未使用"
  fi
done
echo ""

# 测试直接连接
echo "🌐 测试直接连接 Poe API:"
if curl -s --connect-timeout 5 https://api.poe.com/v1/ > /dev/null 2>&1; then
  echo "  ✅ 可以直接连接"
else
  echo "  ❌ 无法直接连接（可能需要代理）"
fi
echo ""

# 推荐配置
echo "💡 推荐配置:"
echo ""
echo "如果你使用 Clash/ClashX:"
echo "  代理地址: http://127.0.0.1:7890"
echo ""
echo "如果你使用 V2RayU:"
echo "  代理地址: http://127.0.0.1:1087"
echo ""
echo "如果你使用 Surge:"
echo "  代理地址: http://127.0.0.1:6152"
echo ""
echo "如果你使用 Shadowsocks:"
echo "  代理地址: socks5://127.0.0.1:1080"
echo ""
echo "⚙️  配置步骤:"
echo "1. 打开 Raycast 设置 (⌘ + ,)"
echo "2. Extensions → Poe Talk"
echo "3. 在 'Proxy URL' 中填入上面的代理地址"
echo "4. 保存并重试"
echo ""

# 检测 Clash
if pgrep -x "ClashX" > /dev/null || pgrep -x "Clash" > /dev/null; then
  echo "✅ 检测到 ClashX 正在运行"
  echo "   建议使用: http://127.0.0.1:7890"
  echo ""
fi

# 检测 V2Ray
if pgrep -x "V2RayU" > /dev/null || pgrep -x "v2ray" > /dev/null; then
  echo "✅ 检测到 V2Ray 正在运行"
  echo "   建议使用: http://127.0.0.1:1087"
  echo ""
fi

echo "🧪 测试代理连接 (使用检测到的端口):"
for port in 7890 1087 1080; do
  if lsof -i :"$port" > /dev/null 2>&1; then
    echo "  测试 http://127.0.0.1:$port ..."
    if curl -s --connect-timeout 3 -x "http://127.0.0.1:$port" https://api.poe.com/v1/ > /dev/null 2>&1; then
      echo "  ✅ 通过 127.0.0.1:$port 可以连接到 Poe API"
      echo "  👉 在 Raycast 设置中使用: http://127.0.0.1:$port"
      echo ""
    else
      echo "  ❌ 通过 127.0.0.1:$port 无法连接"
    fi
  fi
done

echo "=============================="
echo "✅ 检测完成"

import { showHUD } from "@raycast/api";
import { testPoeConnection } from "./utils/connection-test";

export default async function Command() {
  await showHUD("正在测试 Poe API 连接...");
  await testPoeConnection();
}

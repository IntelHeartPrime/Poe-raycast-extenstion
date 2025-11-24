import { showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { environment } from "@raycast/api";
import * as fs from "fs/promises";
import * as path from "path";

export default async function Command() {
  const conversationsDir = path.join(environment.supportPath, "conversations");

  try {
    // 确认对话框
    const confirmed = await confirmAlert({
      title: "确认删除所有对话",
      message: "此操作将永久删除所有对话历史记录，无法恢复。",
      icon: Icon.Trash,
      primaryAction: {
        title: "删除",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "取消",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      await showToast(Toast.Style.Success, "操作已取消");
      return;
    }

    // 检查目录是否存在
    try {
      await fs.access(conversationsDir);
    } catch {
      await showToast(Toast.Style.Success, "没有需要删除的对话记录");
      return;
    }

    // 读取所有文件
    const files = await fs.readdir(conversationsDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    if (jsonFiles.length === 0) {
      await showToast(Toast.Style.Success, "没有需要删除的对话记录");
      return;
    }

    // 删除所有 JSON 文件
    await Promise.all(
      jsonFiles.map((file) => fs.unlink(path.join(conversationsDir, file)))
    );

    await showToast(
      Toast.Style.Success,
      "已删除所有对话",
      `共删除 ${jsonFiles.length} 条对话记录`
    );
  } catch (error) {
    console.error("Error clearing history:", error);
    await showToast(
      Toast.Style.Failure,
      "删除失败",
      error instanceof Error ? error.message : "未知错误"
    );
  }
}

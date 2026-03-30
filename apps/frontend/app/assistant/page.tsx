"use client";

import { useCallback, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const hint =
  "示例：把外墙保温加厚 5cm 后重新计算；或将窗墙比降到 0.35 并对比碳排。";

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "您好，我是 GreenClaw 优化助手。连接后端 Gateway 后将调用 OpenClaw Agent 与计算工具。当前为前端演示：发送消息将模拟回复。"
    }
  ]);
  const [sending, setSending] = useState(false);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    // 占位：后续替换为 POST /api/agent/chat 或 SSE
    await new Promise((r) => setTimeout(r, 600));
    const reply: Msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        text.includes("保温") || text.includes("5cm")
          ? "已记录：外墙保温加厚 5cm。下一步将调用计算引擎更新 U 值并重新跑能耗与绿建评分（需后端联调）。"
          : "已收到指令。正式环境将由 Agent 解析意图、修改项目参数并触发「计算中心」任务。"
    };
    setMessages((m) => [...m, reply]);
    setSending(false);
  }, [input, sending]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">优化助手</h1>
        <p className="text-sm text-muted-foreground">自然语言驱动参数调整与重算，对接 OpenClaw Agent（联调后生效）</p>
      </div>

      <Card className="flex h-[min(640px,calc(100vh-12rem))] flex-col">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-lg">对话</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 p-0">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4 pr-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                placeholder="输入优化指令…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="min-h-[88px] flex-1 resize-none"
              />
              <Button className="shrink-0 gap-2 sm:h-[88px] sm:px-6" onClick={() => void send()} disabled={sending}>
                <Send className="h-4 w-4" />
                发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

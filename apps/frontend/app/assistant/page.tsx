"use client";

import { useCallback, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getAgentWsUrl } from "@/lib/agent";
import { apiFetch } from "@/lib/api-client";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type AgentStep = { step: string; detail: string };

const hint =
  "示例：把外墙保温加厚 5cm 后重新计算；或将窗墙比降到 0.35 并对比碳排。";
const wsPreview = getAgentWsUrl();

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "您好，我是 GreenClaw 优化助手。当前已对接后端 Agent Loop：我会解析意图、更新参数并按需触发重算任务。"
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

    try {
      const res = await apiFetch("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          projectId: projectId.trim() || undefined
        })
      });
      const data = await res.json();
      const steps = Array.isArray(data.steps) ? (data.steps as AgentStep[]) : [];
      const stepsText = steps.length
        ? `\n\n执行步骤：\n${steps.map((s) => `- ${s.step}: ${s.detail}`).join("\n")}`
        : "";
      const reply: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${data.reply || "已处理请求。"}${data.jobId ? `\n任务ID：${data.jobId}` : ""}${stepsText}`
      };
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "调用 Agent 失败，请确认已登录且后端网关可用。"
        }
      ]);
    }
    setSending(false);
  }, [input, projectId, sending]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">优化助手</h1>
        <p className="text-sm text-muted-foreground">自然语言驱动参数调整与重算，对接 OpenClaw Agent（联调后生效）</p>
        <p className="mt-1 text-xs text-muted-foreground">WebSocket 预留地址：{wsPreview}</p>
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
            <div className="mb-3">
              <Input
                placeholder="可选：项目 ID（用于参数修改/触发重算）"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
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

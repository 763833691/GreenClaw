"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ComputePage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // 触发计算
  const handleCalculate = async () => {
    if (!projectId) return alert("请选择项目");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId })
      });

      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
        pollStatus(data.jobId); // 开始轮询
      }
    } catch (err) {
      console.error(err);
      alert("调用计算接口失败");
    } finally {
      setLoading(false);
    }
  };

  // 轮询任务状态
  const pollStatus = async (jid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calculate/status/${jid}`, {
          credentials: "include"
        });
        const data = await res.json();

        setStatus(data);

        if (data.status === "completed") {
          clearInterval(interval);
          setResult(data.result);
          alert("✅ 计算完成！");
        } else if (data.status === "failed") {
          clearInterval(interval);
          alert("❌ 计算失败");
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500); // 每 1.5 秒轮询一次
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">计算中心</h1>

      <div className="rounded-2xl bg-white p-8 shadow">
        <input
          type="text"
          placeholder="输入项目 ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mb-6 w-full rounded-xl border p-4"
        />

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "正在计算中..." : "开始计算"}
        </button>

        {jobId && (
          <div className="mt-8 rounded-xl bg-gray-50 p-6">
            <p className="text-sm text-gray-500">Job ID: {jobId}</p>
            {status && (
              <p className="mt-2">
                当前状态：<span className="font-medium">{status.status}</span>
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">计算结果</h2>
            <pre className="overflow-auto rounded-2xl bg-gray-900 p-6 text-green-400">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

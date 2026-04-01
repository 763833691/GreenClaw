"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, clearJwtToken } from "@/lib/api-client";

type Me = { id: string; email: string; name: string };

export function AuthHeader() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const loadMe = useCallback(async () => {
    const res = await apiFetch("/api/me");
    if (!res.ok) {
      setMe(null);
      return;
    }
    const data = (await res.json().catch(() => null)) as Me | null;
    if (data?.id && data?.email) setMe(data);
    else setMe(null);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearJwtToken();
    setMe(null);
    router.push("/");
    router.refresh();
  }

  if (me === undefined) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="加载登录状态" />
      </div>
    );
  }

  if (me) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline" title={me.email}>
          {me.name || me.email}
        </span>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">退出</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button variant="default" size="sm" className="gap-1.5" asChild>
        <Link href="/login">
          <LogIn className="h-4 w-4" />
          登录
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="hidden gap-1.5 sm:flex" asChild>
        <Link href="/register">
          <UserPlus className="h-4 w-4" />
          注册
        </Link>
      </Button>
    </div>
  );
}

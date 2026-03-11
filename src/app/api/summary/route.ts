import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompletedTasksForSummary } from "@/lib/services/summary";

const bodySchema = z
  .object({
    subCategoryId: z.string().min(1),
    reportType: z.enum(["annual", "weekly"]),
    year: z.number().int().min(2020).max(2030),
    weekStarts: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    template: z.string().max(2000).optional(),
  })
  .refine(
    (d) => d.reportType !== "weekly" || (d.weekStarts?.length ?? 0) > 0,
    { message: "周报模式需选择至少一周", path: ["weekStarts"] },
  );

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

function formatItemsForPrompt(items: Awaited<ReturnType<typeof getCompletedTasksForSummary>>): string {
  if (items.length === 0) {
    return "（该时间段内暂无已完成任务）";
  }
  const lines = items.map((item) => {
    const prefix = item.type === "task" ? "主任务" : item.type === "sub_task" ? "子任务" : "进度";
    let line = `- [${prefix}] ${item.content}（周 ${item.weekStart}）`;
    if (item.assignee) line += `，对接人：${item.assignee}`;
    if (item.dueDate) line += `，截止：${item.dueDate}`;
    return line;
  });
  return lines.join("\n");
}

function computeDateRange(
  reportType: "annual" | "weekly",
  year: number,
  weekStarts?: string[],
): { startDate: string; endDate: string; rangeLabel: string } {
  const today = new Date().toISOString().slice(0, 10);
  const isCurrentYear = year === new Date().getFullYear();

  if (reportType === "annual") {
    const startDate = `${year}-01-01`;
    const endDate = isCurrentYear ? today : `${year}-12-31`;
    return {
      startDate,
      endDate,
      rangeLabel: isCurrentYear ? `${year}年（截至今日）` : `${year}年`,
    };
  }

  if (!weekStarts?.length) {
    throw new Error("周报模式需提供 weekStarts");
  }
  const sorted = [...weekStarts].sort();
  const startDate = sorted[0]!;
  const lastMonday = new Date(sorted[sorted.length - 1]! + "T00:00:00");
  lastMonday.setDate(lastMonday.getDate() + 6);
  const endDate = lastMonday.toISOString().slice(0, 10);
  const rangeLabel =
    weekStarts.length === 1
      ? `单周（${startDate} ~ ${endDate}）`
      : `共${weekStarts.length}周（${startDate} ~ ${endDate}）`;
  return { startDate, endDate, rangeLabel };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置，请在 .env 中设置" },
        { status: 500 },
      );
    }

    const { startDate, endDate, rangeLabel } = computeDateRange(
      body.reportType,
      body.year,
      body.weekStarts,
    );

    const items = await getCompletedTasksForSummary(
      body.subCategoryId,
      startDate,
      endDate,
    );

    const taskText = formatItemsForPrompt(items);
    const systemBase = `你是一个专业的周报/月报/年报助手。根据用户提供的已完成任务列表，生成简洁、有条理的总结。要求：
1. 用中文输出
2. 按主题或项目归类，不要简单罗列
3. 突出关键成果和进展
4. 可适当提炼下一步计划或建议
5. 字数控制在 200-400 字之间`;
    const userBase = `请根据以下在 ${rangeLabel}（${startDate} 至 ${endDate}）期间已完成的任务，生成一份总结：\n\n${taskText}`;

    let systemPrompt = systemBase;
    let userPrompt = userBase;
    if (body.template?.trim()) {
      systemPrompt += `\n\n【重要】用户提供了参考模板，请严格遵循以下格式和风格生成总结：\n${body.template.trim()}`;
    }

    const userContent = body.template?.trim()
      ? `${userPrompt}\n\n---\n请参考上述模板格式输出。`
      : userPrompt;

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("DeepSeek API error:", res.status, err);
      return NextResponse.json(
        { error: `AI 服务调用失败: ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "AI 返回内容为空" },
        { status: 502 },
      );
    }

    return NextResponse.json({ summary: content });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误: " + err.issues.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }
    console.error("Summary API error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "生成总结失败",
      },
      { status: 500 },
    );
  }
}

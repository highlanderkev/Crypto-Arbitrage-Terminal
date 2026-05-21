import { Router, type IRouter } from "express";
import { db, researchReportsTable, arbitrageOpportunitiesTable } from "@workspace/db";
import {
  ListResearchReportsQueryParams,
  ListResearchReportsResponse,
  GetResearchReportParams,
  GetResearchReportResponse,
  CreateResearchReportBody,
} from "@workspace/api-zod";
import { eq, desc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/research/reports", async (req, res): Promise<void> => {
  const parsed = ListResearchReportsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [];
  if (params.symbol) {
    conditions.push(eq(researchReportsTable.symbol, params.symbol.toUpperCase()));
  }

  const limit = params.limit ?? 50;

  const reports = await db
    .select()
    .from(researchReportsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(researchReportsTable.createdAt))
    .limit(limit);

  res.json(ListResearchReportsResponse.parse(reports));
});

router.get("/research/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetResearchReportParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select()
    .from(researchReportsTable)
    .where(eq(researchReportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json(GetResearchReportResponse.parse(report));
});

router.post("/research/reports", async (req, res): Promise<void> => {
  const parsed = CreateResearchReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { opportunityId, symbol, customPrompt } = parsed.data;

  // Fetch the opportunity for context
  const [opp] = await db
    .select()
    .from(arbitrageOpportunitiesTable)
    .where(eq(arbitrageOpportunitiesTable.id, opportunityId));

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  const prompt = customPrompt ?? `
Analyze this cryptocurrency cross-exchange arbitrage opportunity and provide a detailed research report:

Symbol: ${opp.symbol}
Buy on: ${opp.buyExchangeName} at $${opp.buyPrice}
Sell on: ${opp.sellExchangeName} at $${opp.sellPrice}
Gross Spread: ${opp.spreadPct.toFixed(4)}%
Buy Fee: ${opp.buyFee.toFixed(4)}%
Sell Fee: ${opp.sellFee.toFixed(4)}%
Net Profit: ${opp.netProfitPct.toFixed(4)}%
Estimated Profit (on $10k): $${opp.estimatedProfitUsd.toFixed(2)}

Please provide:
1. A thorough analysis of this opportunity (3-5 paragraphs)
2. Key risk factors to consider (3-5 bullet points)
3. Key insights and market observations (3-5 bullet points)
4. Your confidence level: high, medium, or low
5. Your recommendation: execute, monitor, or avoid

Respond ONLY in this exact JSON format:
{
  "analysis": "Your detailed analysis here...",
  "confidence": "high|medium|low",
  "recommendation": "execute|monitor|avoid",
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "keyInsights": ["insight 1", "insight 2", "insight 3"]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "You are an expert cryptocurrency arbitrage researcher and quantitative analyst. Analyze arbitrage opportunities with precision, identifying real risks like transfer times, liquidity depth, exchange withdrawal limits, and network congestion. Always respond in the requested JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let parsed2: {
      analysis: string;
      confidence: string;
      recommendation: string;
      riskFactors: string[];
      keyInsights: string[];
    };

    try {
      // Extract JSON even if there's surrounding text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed2 = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      parsed2 = {
        analysis: rawContent,
        confidence: "medium",
        recommendation: "monitor",
        riskFactors: ["Unable to parse structured response"],
        keyInsights: ["Raw analysis provided in the analysis field"],
      };
    }

    const confidence = ["high", "medium", "low"].includes(parsed2.confidence)
      ? (parsed2.confidence as string)
      : "medium";
    const recommendation = ["execute", "monitor", "avoid"].includes(parsed2.recommendation)
      ? (parsed2.recommendation as string)
      : "monitor";

    const [report] = await db
      .insert(researchReportsTable)
      .values({
        opportunityId,
        symbol: opp.symbol,
        buyExchange: opp.buyExchange,
        sellExchange: opp.sellExchange,
        spreadPct: opp.spreadPct,
        analysis: parsed2.analysis,
        confidence,
        recommendation,
        riskFactors: Array.isArray(parsed2.riskFactors) ? parsed2.riskFactors : [],
        keyInsights: Array.isArray(parsed2.keyInsights) ? parsed2.keyInsights : [],
      })
      .returning();

    res.status(201).json(GetResearchReportResponse.parse(report));
  } catch (err) {
    req.log.error({ err }, "Failed to generate AI research report");
    res.status(500).json({ error: "Failed to generate research report" });
  }
});

export default router;

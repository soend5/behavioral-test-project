/**
 * POST /api/admin/config/import - 导入配置数据
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): ApiFail {
  return { ok: false, error: { code, message } };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  try {
    const body = await req.json();
    const { sops, scripts, trainingPlans, mode = "merge" } = body;

    const result = {
      sops: { created: 0, updated: 0, skipped: 0 },
      scripts: { created: 0, updated: 0, skipped: 0 },
      trainingPlans: { created: 0, updated: 0, skipped: 0 },
    };

    // 导入 SOP
    if (sops && Array.isArray(sops)) {
      for (const sop of sops) {
        const existing = await prisma.sopDefinition.findUnique({
          where: { sopId: sop.sopId },
        });

        if (existing) {
          if (mode === "skip") {
            result.sops.skipped++;
            continue;
          }
          await prisma.sopDefinition.update({
            where: { sopId: sop.sopId },
            data: {
              sopName: sop.sopName,
              sopStage: sop.sopStage,
              status: sop.status,
              priority: sop.priority,
              stateSummary: sop.stateSummary,
              coreGoal: sop.coreGoal,
              strategyListJson: sop.strategyList ? JSON.stringify(sop.strategyList) : null,
              forbiddenListJson: sop.forbiddenList ? JSON.stringify(sop.forbiddenList) : null,
              notes: sop.notes,
            },
          });
          result.sops.updated++;
        } else {
          await prisma.sopDefinition.create({
            data: {
              sopId: sop.sopId,
              sopName: sop.sopName,
              sopStage: sop.sopStage,
              status: sop.status || "active",
              priority: sop.priority || 0,
              stateSummary: sop.stateSummary,
              coreGoal: sop.coreGoal,
              strategyListJson: sop.strategyList ? JSON.stringify(sop.strategyList) : null,
              forbiddenListJson: sop.forbiddenList ? JSON.stringify(sop.forbiddenList) : null,
              notes: sop.notes,
            },
          });
          result.sops.created++;
        }

        // 导入规则
        if (sop.rules && Array.isArray(sop.rules)) {
          for (const rule of sop.rules) {
            const existingRule = await prisma.sopRule.findUnique({
              where: { ruleId: rule.ruleId },
            });

            if (existingRule) {
              if (mode !== "skip") {
                await prisma.sopRule.update({
                  where: { ruleId: rule.ruleId },
                  data: {
                    requiredStage: rule.requiredStage,
                    requiredTagsJson: rule.requiredTags ? JSON.stringify(rule.requiredTags) : null,
                    excludedTagsJson: rule.excludedTags ? JSON.stringify(rule.excludedTags) : null,
                    confidence: rule.confidence,
                    status: rule.status,
                  },
                });
              }
            } else {
              await prisma.sopRule.create({
                data: {
                  ruleId: rule.ruleId,
                  sopId: sop.sopId,
                  requiredStage: rule.requiredStage,
                  requiredTagsJson: rule.requiredTags ? JSON.stringify(rule.requiredTags) : null,
                  excludedTagsJson: rule.excludedTags ? JSON.stringify(rule.excludedTags) : null,
                  confidence: rule.confidence || 0,
                  status: rule.status || "active",
                },
              });
            }
          }
        }
      }
    }

    // 导入话术
    if (scripts && Array.isArray(scripts)) {
      for (const script of scripts) {
        const existing = script.id 
          ? await prisma.scriptTemplate.findUnique({ where: { id: script.id } })
          : null;

        if (existing) {
          if (mode === "skip") {
            result.scripts.skipped++;
            continue;
          }
          await prisma.scriptTemplate.update({
            where: { id: script.id },
            data: {
              name: script.name,
              category: script.category,
              triggerStage: script.triggerStage,
              triggerArchetype: script.triggerArchetype,
              triggerTagsJson: script.triggerTags ? JSON.stringify(script.triggerTags) : null,
              content: script.content,
              variablesJson: script.variables ? JSON.stringify(script.variables) : null,
              status: script.status,
              sopId: script.sopId,
            },
          });
          result.scripts.updated++;
        } else {
          await prisma.scriptTemplate.create({
            data: {
              name: script.name,
              category: script.category,
              triggerStage: script.triggerStage,
              triggerArchetype: script.triggerArchetype,
              triggerTagsJson: script.triggerTags ? JSON.stringify(script.triggerTags) : null,
              content: script.content,
              variablesJson: script.variables ? JSON.stringify(script.variables) : null,
              status: script.status || "active",
              sopId: script.sopId,
            },
          });
          result.scripts.created++;
        }
      }
    }

    await writeAudit(
      prisma,
      session.user.id,
      "config.import",
      "Config",
      null,
      { result, mode }
    );

    return NextResponse.json(ok({
      message: "导入完成",
      result,
    }));
  } catch (error) {
    console.error("Config import error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}

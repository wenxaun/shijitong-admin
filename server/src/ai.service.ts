import { Injectable } from '@nestjs/common';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 解析后的任务信息
 */
interface ParsedTaskInfo {
  title: string;           // 任务标题
  description: string;     // 任务描述
  dueDate: string;         // 截止日期 (YYYY-MM-DD)
  priority: 'P0' | 'P1' | 'P2' | 'P3';  // 优先级
  executor: string;        // 执行人
  confidence: number;      // 置信度 (0-100)
}

@Injectable()
export class AiService {
  private client: LLMClient;
  private config: Config;

  constructor() {
    this.config = new Config();
    this.client = new LLMClient(this.config);
  }

  /**
   * 聊天接口 - 支持多轮对话
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      thinking?: 'enabled' | 'disabled';
    },
    headers?: Record<string, string>
  ) {
    const client = headers ? new LLMClient(this.config, headers) : this.client;
    
    const response = await client.invoke(messages, {
      model: options?.model || 'doubao-seed-1-8-251228',
      temperature: options?.temperature ?? 0.7,
      thinking: options?.thinking || 'disabled',
    });

    return response.content;
  }

  /**
   * 流式聊天接口 - 实时返回
   */
  async *chatStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      thinking?: 'enabled' | 'disabled';
    },
    headers?: Record<string, string>
  ) {
    const client = headers ? new LLMClient(this.config, headers) : this.client;
    
    const stream = client.stream(messages, {
      model: options?.model || 'doubao-seed-1-8-251228',
      temperature: options?.temperature ?? 0.7,
      thinking: options?.thinking || 'disabled',
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content.toString();
      }
    }
  }

  /**
   * 解析分享内容 - 从聊天消息中提取任务信息
   */
  async parseShareContent(content: string, headers?: Record<string, string>): Promise<ParsedTaskInfo> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const systemPrompt = `你是一个专业的任务管理助手。你需要从用户分享的聊天消息中提取任务信息。

当前日期：${todayStr}

请根据消息内容，提取以下信息：
1. **任务标题** - 简洁明确的任务名称（不超过20字）
2. **任务描述** - 任务的详细说明（如有）
3. **截止日期** - 格式为 YYYY-MM-DD
   - 如果是"明天"、"后天"等相对时间，请转换为具体日期
   - 如果是"下周五"、"本周三"等，请根据当前日期计算
   - 如果没有明确截止时间，默认设置为7天后
4. **优先级** - P0(紧急重要)、P1(重要)、P2(普通)、P3(次要)
   - 包含"紧急"、"立即"、"马上"等关键词 → P0
   - 包含"重要"、"关键"等关键词 → P1
   - 包含"有空"、"方便时"等关键词 → P3
   - 其他情况默认 → P2
5. **置信度** - 对提取结果的确定程度(0-100)

请以 JSON 格式返回结果，格式如下：
{
  "title": "任务标题",
  "description": "任务描述",
  "dueDate": "2024-01-15",
  "priority": "P1",
  "executor": "",
  "confidence": 85
}

注意：
- 只返回 JSON，不要有其他内容
- 如果无法提取有效信息，confidence 设为 0
- title 是必填项，其他可以为空`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请从以下消息中提取任务信息：\n\n${content}` }
    ];

    const response = await this.chat(messages, { temperature: 0.3 }, headers);
    
    try {
      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || '',
          description: parsed.description || '',
          dueDate: parsed.dueDate || this.getDefaultDueDate(),
          priority: parsed.priority || 'P2',
          executor: parsed.executor || '',
          confidence: parsed.confidence || 50
        };
      }
    } catch (e) {
      console.error('解析 AI 响应失败:', e);
    }

    // 解析失败，返回默认值
    return {
      title: content.substring(0, 20),
      description: content,
      dueDate: this.getDefaultDueDate(),
      priority: 'P2',
      executor: '',
      confidence: 30
    };
  }

  /**
   * 获取默认截止日期（7天后）
   */
  private getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  /**
   * 任务分析 - 分析任务并给出建议
   */
  async analyzeTask(taskInfo: {
    name: string;
    description?: string;
    priority?: string;
    deadline?: string;
  }, headers?: Record<string, string>) {
    const systemPrompt = `你是一个专业的项目管理助手。你的任务是：
1. 分析用户提供的任务信息
2. 评估任务的复杂度和风险
3. 给出具体的执行建议
4. 如果需要，建议拆分子任务

请用简洁、专业的语言回复，格式清晰。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请分析以下任务：
任务名称：${taskInfo.name}
${taskInfo.description ? `任务描述：${taskInfo.description}` : ''}
${taskInfo.priority ? `优先级：${taskInfo.priority}` : ''}
${taskInfo.deadline ? `截止日期：${taskInfo.deadline}` : ''}

请给出你的分析和建议。` }
    ];

    return this.chat(messages, { thinking: 'enabled' }, headers);
  }

  /**
   * 周报生成 - 根据任务数据生成周报
   */
  async generateWeeklyReport(tasks: Array<{
    name: string;
    status: string;
    score?: number;
    description?: string;
  }>, headers?: Record<string, string>) {
    const systemPrompt = `你是一个专业的项目汇报助手。根据用户提供的本周任务完成情况，生成一份结构清晰的周报。

周报格式要求：
1. **本周概述** - 简要总结本周工作
2. **完成任务** - 列出已完成的任务及亮点
3. **进行中任务** - 说明进度和预期
4. **问题与风险** - 指出可能的问题
5. **下周计划** - 给出建议

语言要简洁、专业、突出重点。`;

    const taskSummary = tasks.map((t, i) => 
      `${i + 1}. ${t.name} - 状态: ${t.status}${t.score ? ` - 评分: ${t.score}` : ''}${t.description ? ` - ${t.description}` : ''}`
    ).join('\n');

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `本周任务情况：\n${taskSummary}\n\n请生成周报。` }
    ];

    return this.chat(messages, { temperature: 0.5 }, headers);
  }

  /**
   * 复盘建议 - 分析任务完成情况并给出改进建议
   */
  async reviewTask(taskInfo: {
    name: string;
    description?: string;
    score?: number;
    delayReason?: string;
    completedOnTime: boolean;
  }, headers?: Record<string, string>) {
    const systemPrompt = `你是一个专业的项目复盘助手。根据任务的完成情况，帮助用户进行复盘分析。

复盘内容应包括：
1. **完成情况分析** - 评估任务完成质量
2. **做得好的地方** - 肯定成绩
3. **改进空间** - 指出可以优化的地方
4. **具体建议** - 给出可执行的改进措施

语言要积极正面，建议要具体可操作。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请帮我复盘这个任务：
任务名称：${taskInfo.name}
${taskInfo.description ? `任务描述：${taskInfo.description}` : ''}
${taskInfo.score ? `评分：${taskInfo.score}分` : ''}
是否按时完成：${taskInfo.completedOnTime ? '是' : '否'}
${taskInfo.delayReason ? `延迟原因：${taskInfo.delayReason}` : ''}

请给出复盘分析。` }
    ];

    return this.chat(messages, { thinking: 'enabled' }, headers);
  }

  /**
   * 代码助手 - 帮助生成或解释代码
   */
  async codeAssistant(params: {
    action: 'generate' | 'explain' | 'debug' | 'optimize';
    language?: string;
    code?: string;
    requirement?: string;
  }, headers?: Record<string, string>) {
    const systemPrompt = `你是一个专业的编程助手。根据用户需求：
- 生成代码：写出清晰、高效、可维护的代码，包含注释
- 解释代码：用通俗易懂的语言解释代码逻辑
- 调试代码：分析问题原因，给出修复建议
- 优化代码：指出性能或可读性问题，给出优化方案

回复要结构清晰，代码块使用 markdown 格式。`;

    let userContent = '';
    
    switch (params.action) {
      case 'generate':
        userContent = `请用 ${params.language || 'TypeScript'} 生成代码：\n${params.requirement}`;
        break;
      case 'explain':
        userContent = `请解释以下代码：\n\`\`\`${params.language || ''}\n${params.code}\n\`\`\``;
        break;
      case 'debug':
        userContent = `请帮我调试以下代码，找出问题：\n\`\`\`${params.language || ''}\n${params.code}\n\`\`\``;
        break;
      case 'optimize':
        userContent = `请优化以下代码：\n\`\`\`${params.language || ''}\n${params.code}\n\`\`\``;
        break;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent }
    ];

    return this.chat(messages, { temperature: 0.3 }, headers);
  }
}

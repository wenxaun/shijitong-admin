import { Controller, Get, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from '@/app.service';
import { AiService } from '@/ai.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly aiService: AiService
  ) {}

  @Get('hello')
  getHello(): { status: string; data: string } {
    return {
      status: 'success',
      data: this.appService.getHello()
    };
  }

  @Get('health')
  getHealth(): { status: string; data: string } {
    return {
      status: 'success',
      data: new Date().toISOString(),
    };
  }

  /**
   * 解析分享内容 - 从聊天消息中提取任务信息
   */
  @Post('parse-share')
  @HttpCode(HttpStatus.OK)
  async parseShareContent(
    @Body() body: { content: string },
    @Headers() headers: Record<string, string>
  ): Promise<{
    status: string;
    data?: {
      title: string;
      description: string;
      dueDate: string;
      priority: 'P0' | 'P1' | 'P2' | 'P3';
      executor: string;
      confidence: number;
    };
    message?: string;
  }> {
    console.log('[parse-share] 开始解析分享内容');
    console.log('[parse-share] 内容:', body.content);
    
    if (!body.content || typeof body.content !== 'string') {
      return {
        status: 'error',
        message: '请提供要解析的内容'
      };
    }

    try {
      const parsed = await this.aiService.parseShareContent(body.content, headers);
      console.log('[parse-share] 解析结果:', JSON.stringify(parsed));
      
      return {
        status: 'success',
        data: parsed
      };
    } catch (error) {
      console.error('[parse-share] 解析失败:', error);
      return {
        status: 'error',
        message: '解析失败，请稍后重试'
      };
    }
  }

  /**
   * AI 聊天接口
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() body: { messages: Array<{ role: string; content: string }>; options?: any },
    @Headers() headers: Record<string, string>
  ): Promise<{ status: string; data?: string; message?: string }> {
    if (!body.messages || !Array.isArray(body.messages)) {
      return {
        status: 'error',
        message: '请提供有效的消息数组'
      };
    }

    try {
      const response = await this.aiService.chat(
        body.messages as any,
        body.options,
        headers
      );
      
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      console.error('[chat] 对话失败:', error);
      return {
        status: 'error',
        message: '对话失败，请稍后重试'
      };
    }
  }

  /**
   * 任务分析接口
   */
  @Post('analyze-task')
  @HttpCode(HttpStatus.OK)
  async analyzeTask(
    @Body() body: { name: string; description?: string; priority?: string; deadline?: string },
    @Headers() headers: Record<string, string>
  ): Promise<{ status: string; data?: string; message?: string }> {
    if (!body.name) {
      return {
        status: 'error',
        message: '请提供任务名称'
      };
    }

    try {
      const response = await this.aiService.analyzeTask(body, headers);
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      console.error('[analyze-task] 分析失败:', error);
      return {
        status: 'error',
        message: '分析失败，请稍后重试'
      };
    }
  }

  /**
   * 周报生成接口
   */
  @Post('generate-weekly-report')
  @HttpCode(HttpStatus.OK)
  async generateWeeklyReport(
    @Body() body: { tasks: Array<{ name: string; status: string; score?: number; description?: string }> },
    @Headers() headers: Record<string, string>
  ): Promise<{ status: string; data?: string; message?: string }> {
    if (!body.tasks || !Array.isArray(body.tasks)) {
      return {
        status: 'error',
        message: '请提供任务列表'
      };
    }

    try {
      const response = await this.aiService.generateWeeklyReport(body.tasks, headers);
      return {
        status: 'success',
        data: response
      };
    } catch (error) {
      console.error('[generate-weekly-report] 生成失败:', error);
      return {
        status: 'error',
        message: '生成失败，请稍后重试'
      };
    }
  }
}

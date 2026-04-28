import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigCategory, AppConfig } from '../../src/types/config';

/**
 * 配置管理控制器
 */
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取当前配置（公开部分）
   */
  @Get('current')
  async getCurrentConfig(): Promise<AppConfig> {
    return await this.configService.getCurrentConfig();
  }

  /**
   * 获取配置版本号
   */
  @Get('version')
  async getConfigVersion(): Promise<{ version: string; updatedAt: string }> {
    const config = await this.configService.getCurrentConfig();
    return {
      version: config._version,
      updatedAt: config._updatedAt,
    };
  }

  /**
   * 获取配置记录列表
   */
  @Get('records')
  async getConfigRecords(@Query('category') category?: ConfigCategory) {
    return await this.configService.getConfigRecords(category);
  }

  /**
   * 获取单个配置记录
   */
  @Get('records/:id')
  async getConfigRecord(@Param('id') id: string) {
    return await this.configService.getConfigRecord(id);
  }

  /**
   * 更新配置记录
   */
  @Put('records/:id')
  async updateConfigRecord(
    @Param('id') id: string,
    @Body() body: { value: any; operator?: string }
  ) {
    return await this.configService.updateConfigRecord(
      id,
      body.value,
      body.operator || 'unknown'
    );
  }

  /**
   * 批量更新配置
   */
  @Post('batch-update')
  async batchUpdateConfig(
    @Body() body: { updates: Array<{ id: string; value: any }>; operator?: string }
  ) {
    return await this.configService.batchUpdateConfig(
      body.updates,
      body.operator || 'unknown'
    );
  }

  /**
   * 获取配置版本列表
   */
  @Get('versions')
  async getConfigVersions() {
    return await this.configService.getConfigVersions();
  }

  /**
   * 获取配置变更详情
   */
  @Get('versions/:id')
  async getVersionChanges(@Param('id') id: string) {
    return await this.configService.getVersionChanges(id);
  }

  /**
   * 回滚到指定版本
   */
  @Post('versions/:id/rollback')
  async rollbackToVersion(
    @Param('id') id: string,
    @Body() body: { operator?: string }
  ) {
    return await this.configService.rollbackToVersion(
      id,
      body.operator || 'unknown'
    );
  }
}

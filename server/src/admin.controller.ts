import { Controller, Get, Post, Delete, Put, Body, Query, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.adminService.login(body.username, body.password);
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('userType') userType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getUsers({
      search,
      userType,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Put('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getAnalytics(startDate, endDate);
  }

  @Get('analytics/export')
  async exportAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const csv = await this.adminService.exportAnalytics(startDate, endDate);
    return csv;
  }

  @Get('system/status')
  async getSystemStatus() {
    return this.adminService.getSystemStatus();
  }

  @Get('system/logs')
  async getSystemLogs(
    @Query('level') level?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getSystemLogs({
      level,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('config')
  async getConfig() {
    return this.adminService.getConfig();
  }

  @Post('config/update')
  async updateConfig(@Body() body: any) {
    return this.adminService.updateConfig(body);
  }

  @Post('config/sync-to-cloud')
  async syncConfigToCloud() {
    return this.adminService.syncConfigToCloud();
  }

  @Post('config/reload')
  async reloadConfig() {
    return this.adminService.reloadConfig();
  }

  @Get('permissions/:openid')
  async getUserPermissions(@Param('openid') openid: string) {
    return this.adminService.getUserPermissions(openid);
  }

  @Get('users/:id/related-data')
  async getUserRelatedData(@Param('id') id: string) {
    return this.adminService.getUserRelatedData(id);
  }

  @Post('users/:id/backup')
  async backupUserTasks(
    @Param('id') id: string,
    @Body() body: { targetUserId: string }
  ) {
    return this.adminService.backupUserTasks(id, body.targetUserId);
  }

  @Delete('users/:id/cascade')
  async deleteUserWithCascade(
    @Param('id') id: string,
    @Body() body?: { backupToUserId?: string }
  ) {
    return this.adminService.deleteUserWithCascade(id, body || {});
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { PusherService } from './pusher.service';

@Controller('pusher')
export class PusherController {
  constructor(private pusher: PusherService) {}

  @Post('auth')
  auth(
    @Body('socket_id') socketId: string,
    @Body('channel_name') channelName: string,
  ) {
    const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    const userInfo = { id: userId, name: `Player ${userId.slice(-4)}` };

    return this.pusher.authenticatePresence(socketId, channelName, userInfo);
  }
}
// src/pusher/pusher.controller.ts
import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { PusherService } from './pusher.service';

@Controller('pusher')
export class PusherController {
  constructor(private readonly pusher: PusherService) {}

  @Post('auth')
  @HttpCode(200)
  auth(@Body() body: any) {
    // pusher-js sends a urlencoded body; if a client overrides Content-Type
    // incorrectly the body parser may not populate `body`. Defensively handle it.
    const { socket_id, channel_name } = body ?? {};

    if (!socket_id || !channel_name) {
      return { error: 'Missing socket_id or channel_name' };
    }

    const userId = `user-${Math.random().toString(36).substring(2, 9)}`;
    const userInfo = { id: userId, name: `Player ${userId.slice(-4)}` };

    // Pusher expects `user_id` (string) and optional `user_info`
    return this.pusher.authenticatePresence(socket_id, channel_name, {
      user_id: userInfo.id,
      user_info: userInfo,
    });
  }

  // Allow broadcasting events from the frontend through the server so we can
  // enforce server-side auth and avoid client-trigger-only patterns.
  @Post('trigger')
  @HttpCode(200)
  async trigger(@Body() body: { channel: string; event: string; data: any }) {
    const { channel, event, data } = body ?? {};

    if (!channel || !event) {
      return { error: 'Missing channel or event in request body' };
    }

    try {
      await this.pusher.trigger(channel, event, data ?? {});
      return { ok: true };
    } catch (err) {
      // Return error details for debugging in dev (don't leak secrets in prod)
      return { ok: false, error: String(err) };
    }
  }
}
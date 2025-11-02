// src/pusher/pusher.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor(private config: ConfigService) {
    this.pusher = new Pusher({
      appId: this.config.getOrThrow('PUSHER_APP_ID'),
      key: this.config.getOrThrow('PUSHER_KEY'),
      secret: this.config.getOrThrow('PUSHER_SECRET'),
      cluster: this.config.getOrThrow('PUSHER_CLUSTER'),
      useTLS: true,
    });
  }

  async trigger(channel: string, event: string, data: any) {
    return this.pusher.trigger(channel, event, data);
  }

  // Called by the auth endpoint
  authenticatePresence(socketId: string, channelName: string, presenceData: any) {
    return this.pusher.authenticate(socketId, channelName, presenceData);
  }
}
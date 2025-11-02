// src/rooms/rooms.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('create')
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  @Get(':code')
  async getRoom(@Param('code') code: string) {
    if (!code || code.length !== 6) {
      throw new NotFoundException('Invalid room code');
    }
    return this.roomsService.getRoomByCode(code);
  }
}
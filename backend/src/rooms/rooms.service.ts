import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { customAlphabet } from 'nanoid';
import axios from 'axios';
import { CreateRoomDto } from './dto/create-room.dto';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

@Injectable()
export class RoomsService {
  private readonly sudokuApiKey: string;
  private readonly sudokuBaseUrl =
    'https://api.api-ninjas.com/v1/sudokugenerate';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.sudokuApiKey = this.config.getOrThrow('SUDOKU_API_KEY');
  }

  /** Generate a unique 6-char room code */
  private async generateUniqueCode(): Promise<string> {
    let code: string = "";
    let exists = true;
    while (exists) {
      code = nanoid();
      exists = !!(await this.prisma.room.findUnique({ where: { roomCode: code } }));
    }
    return code;
  }

  /** Fetch puzzle + solution from API Ninjas */
  private async fetchSudoku(difficulty: string) {
    const { data } = await axios.get(this.sudokuBaseUrl, {
      params: { difficulty },
      headers: { 'X-Api-Key': this.sudokuApiKey },
    });

    if (!data.puzzle || !data.solution) {
      throw new BadRequestException('Invalid response from Sudoku API');
    }

    // API returns 9x9 arrays with nulls — just validate and return
    const isValidGrid = (grid: any) =>
      Array.isArray(grid) &&
      grid.length === 9 &&
      grid.every((row: any) => Array.isArray(row) && row.length === 9);

    if (!isValidGrid(data.puzzle) || !isValidGrid(data.solution)) {
      throw new BadRequestException('Invalid grid format from Sudoku API');
    }

    return {
      puzzle: data.puzzle,
      solution: data.solution,
    };
  }

  /** CREATE ROOM */
  async createRoom(dto: CreateRoomDto) {
    const { mode, difficulty } = dto;

    const { puzzle, solution } = await this.fetchSudoku(difficulty);
    const roomCode = await this.generateUniqueCode();

    const room = await this.prisma.room.create({
      data: {
        roomCode,
        mode,
        difficulty,
        puzzle,
        solution,
        status: 'waiting',
        // other fields stay null / default
      },
    });

    return { roomId: room.id, roomCode };
  }

  /** GET ROOM (public view – no solution) */
  async getRoomByCode(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomCode },
    });

    if (!room) throw new NotFoundException('Room not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { solution, ...safeRoom } = room;
    return safeRoom;
  }

  /** (Future) Start game – update status */
  async startGame(roomCode: string) {
    return this.prisma.room.update({
      where: { roomCode },
      data: { status: 'started' },
    });
  }
}
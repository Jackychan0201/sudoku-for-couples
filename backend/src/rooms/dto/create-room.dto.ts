import { IsEnum } from 'class-validator';

export enum GameMode {
  TOGETHER = 'together',
  COMPETITIVE = 'competitive',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class CreateRoomDto {
  @IsEnum(GameMode, { message: 'Mode must be "together" or "competitive"' })
  mode!: GameMode;

  @IsEnum(Difficulty, { message: 'Difficulty must be "easy", "medium", or "hard"' })
  difficulty!: Difficulty;
}
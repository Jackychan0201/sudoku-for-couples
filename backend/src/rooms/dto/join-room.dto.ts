import { z } from 'zod';

export const JoinRoomSchema = z.object({
  roomCode: z.string().length(6),
});

export type JoinRoomDto = z.infer<typeof JoinRoomSchema>;
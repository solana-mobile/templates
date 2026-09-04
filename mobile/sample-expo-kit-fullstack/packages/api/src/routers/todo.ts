import { db } from '@repo/db'
import { todo } from '@repo/db/schema/todo'
import { and, eq } from 'drizzle-orm'
import z from 'zod'

import { authRequiredProcedure } from '../index'

export const todoRouter = {
  getAll: authRequiredProcedure.handler(async ({ context }) => {
    return await db
      .select()
      .from(todo)
      .where(eq(todo.userId, context.session.user.id))
  }),

  create: authRequiredProcedure
    .input(z.object({ text: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      return await db.insert(todo).values({
        userId: context.session.user.id,
        text: input.text,
      })
    }),

  toggle: authRequiredProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(async ({ context, input }) => {
      return await db
        .update(todo)
        .set({ completed: input.completed })
        .where(
          and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)),
        )
    }),

  delete: authRequiredProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ context, input }) => {
      return await db
        .delete(todo)
        .where(
          and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)),
        )
    }),
}

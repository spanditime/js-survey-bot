import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { db } from './db'

export type Pupil = {
  source: string,
  id?: number|undefined,
  name?: string|undefined,
  city?: string|undefined,
  request?: string|undefined,
  contact?: string|undefined,
  age?: string|undefined
}
const pupilSchema = z.object({
  source:z.string(),
  id: z.onumber(),
  name: z.ostring(),
  city: z.ostring(),
  request: z.ostring(),
  contact: z.ostring(),
  age: z.ostring(),
})


const t = initTRPC.create();

const router = t.router;
const pubProc = t.procedure;

export const surveyRouter = router({
getPupil: pubProc.input(pupilSchema).query(async (opts) => {
    const { input } = opts;

  }),
createOrUpdatePupil: pubProc.input(pupilSchema).mutation(async (opts) => {
    const { input } = opts
    db.submit(input)
  }),
// deletePupil: (source: string, id: number) => void;
});


import { Request, Response } from 'express'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '../database/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'

// ── Language ID mapping for Judge0 API ────────────────
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python:     71,
  javascript: 63,
  java:       62,
}

// ── Validation schema ──────────────────────────────────
export const executeCodeSchema = z.object({
  code:     z.string().max(65536, 'Code must be under 64KB'),
  language: z.enum(['python', 'javascript', 'java']),
})

interface Judge0Submission { token: string }
interface Judge0Result {
  stdout:         string | null
  stderr:         string | null
  compile_output: string | null
  message:        string | null
  status:         { id: number; description: string }
  time:           string | null
  memory:         number | null
}

/**
 * POST /api/rooms/:roomId/execute
 * Submits code to Judge0 for sandboxed execution.
 */
export async function executeCode(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const { code, language } = req.body as z.infer<typeof executeCodeSchema>
  const userId = req.authUser!.id

  // Verify user is a member of the room
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!membership) throw createError('You are not a member of this room', 403)

  // Mock mode when no Judge0 key is set
  if (!env.JUDGE0_API_KEY) {
    res.json({
      mock:    true,
      message: '⚠️  MOCK MODE: Judge0 API key not configured. Set JUDGE0_API_KEY in .env to enable real execution.',
      stdout:  getMockOutput(language, code),
      stderr:  null,
      compile_output: null,
      status:  { id: 3, description: 'Accepted (Mock)' },
      time:    '0.001',
      memory:  0,
    })
    return
  }

  const languageId = JUDGE0_LANGUAGE_IDS[language]

  // Submit to Judge0
  let submissionToken: string
  try {
    const submitRes = await axios.post<Judge0Submission>(
      `${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`,
      { language_id: languageId, source_code: code, cpu_time_limit: 5, memory_limit: 128000 },
      {
        headers: { 'Content-Type': 'application/json', 'X-RapidAPI-Key': env.JUDGE0_API_KEY, 'X-RapidAPI-Host': env.JUDGE0_API_HOST },
        timeout: 10000,
      }
    )
    submissionToken = submitRes.data.token
  } catch (err) {
    console.error('[Judge0] Submission error:', err)
    throw createError('Code execution service unavailable', 503)
  }

  const result = await pollJudge0(submissionToken)
  res.json({ mock: false, ...result })
}

async function pollJudge0(token: string, attempts = 10): Promise<Judge0Result> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const res = await axios.get<Judge0Result>(
      `${env.JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
      {
        headers: { 'X-RapidAPI-Key': env.JUDGE0_API_KEY, 'X-RapidAPI-Host': env.JUDGE0_API_HOST },
        timeout: 5000,
      }
    )
    if (res.data.status.id >= 3) return res.data
  }
  throw createError('Code execution timed out', 408)
}

function getMockOutput(language: string, code: string): string {
  const lines = code.split('\n').length
  return `[Mock Output — Configure JUDGE0_API_KEY for real execution]\nLanguage: ${language} | Lines: ${lines}\nSimulated output: Hello from ${language}!`
}

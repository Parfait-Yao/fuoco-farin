/**
 * Creates (or promotes) an administrator account. This is the only way to get
 * the ADMIN role: public sign-up always creates CLIENT profiles.
 *
 * Runs locally with the Supabase secret (service role) key, which never
 * reaches the browser.
 *
 *   pnpm admin:create --email admin@example.com --first-name Eric --last-name Admin
 *
 * The password comes from the ADMIN_PASSWORD env variable or a hidden prompt,
 * never from a CLI argument (it would stay in the shell history).
 */
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const args = new Map<string, string>();
process.argv.slice(2).forEach((arg, i, all) => {
  if (arg.startsWith('--')) args.set(arg.slice(2), all[i + 1] ?? '');
});

const passwordSchema = z
  .string()
  .min(12, 'Password: 12 characters minimum')
  .regex(/[a-z]/, 'Password: one lowercase letter')
  .regex(/[A-Z]/, 'Password: one uppercase letter')
  .regex(/[0-9]/, 'Password: one digit')
  .regex(/[^A-Za-z0-9]/, 'Password: one symbol');

async function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const input = z
    .object({
      email: z.string().trim().toLowerCase().email('Invalid --email'),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().max(80),
    })
    .parse({ email: args.get('email'), firstName: args.get('first-name') || 'Admin', lastName: args.get('last-name') || '' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');

  const password = passwordSchema.parse(process.env.ADMIN_PASSWORD || (await askHidden('Admin password: ')));
  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    let userId = existing?.id;

    if (userId) {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password, app_metadata: { role: 'admin' }, email_confirm: true });
      if (error) throw error;
      console.log(`Existing account promoted to admin: ${input.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: input.email,
        password,
        email_confirm: true,
        app_metadata: { role: 'admin' },
        user_metadata: { first_name: input.firstName, last_name: input.lastName },
      });
      if (error || !data.user) throw error ?? new Error('User creation failed');
      userId = data.user.id;
      console.log(`Admin account created: ${input.email}`);
    }

    // The auth trigger creates the profile as CLIENT; promote it here.
    await prisma.user.upsert({
      where: { id: userId },
      update: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
      create: { id: userId, email: input.email, role: 'ADMIN', firstName: input.firstName, lastName: input.lastName, emailVerifiedAt: new Date() },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof z.ZodError ? error.issues.map((i) => i.message).join('\n') : error);
  process.exitCode = 1;
});

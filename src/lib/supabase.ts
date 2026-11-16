import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createLocalClient } from "@/lib/local-db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 是否使用本地文件数据库（data/db.json）。
 * - 默认：始终使用本地文件数据库（开发与生产一致），适用于 NAS 本地部署。
 * - 仅在显式设置 LOCAL_DB=false 时才切回远程 Supabase。
 */
function useLocalDb(): boolean {
  return process.env.LOCAL_DB !== "false";
}

const _client: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

const envError =
  "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them in Vercel Project Settings → Environment Variables.";

const _resolved: SupabaseClient = useLocalDb()
  ? (createLocalClient() as unknown as SupabaseClient)
  : ((_client ??
      new Proxy({} as SupabaseClient, {
        get() {
          throw new Error(envError);
        },
      })) as SupabaseClient);

export const supabase = _resolved;